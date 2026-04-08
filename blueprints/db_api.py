from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

import requests

from flask import Blueprint, current_app, jsonify, request
from cache import cache
from dotenv import load_dotenv
from heroes import get_hero_name

load_dotenv()
bp = Blueprint("dlns_db_api", __name__, url_prefix="/db")


def _rows_to_dicts(cur: sqlite3.Cursor) -> List[Dict[str, Any]]:
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def get_ro_conn() -> sqlite3.Connection:
    db_path = Path(current_app.config.get("DB_PATH", "./data/dlns.sqlite3")).resolve()
    uri = f"file:{db_path.as_posix()}?mode=ro&cache=shared"
    conn = sqlite3.connect(uri, uri=True, timeout=15)
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.execute("PRAGMA busy_timeout=5000;")
    return conn


def format_player_data(player_row):
    """Convert player row to dict with hero name included."""
    player = dict(player_row)
    if 'hero_id' in player:
        player['hero_name'] = get_hero_name(player['hero_id'])
    return player


@bp.get("/weeks")
@cache.cached(timeout=300)
def weeks_map():  # type: ignore
    matches_file = Path(current_app.root_path).parent / "matches.json"
    if not matches_file.exists():
        matches_file = Path("matches.json").resolve()
    try:
        with open(matches_file, encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return jsonify({"weeks": {}, "title": ""})
    result = {}
    for entry in data.get("weeks", []):
        week = entry.get("week")
        ids = entry.get("match_ids")
        if isinstance(ids, list):
            for mid in ids:
                result[str(mid)] = week
    return jsonify({"weeks": result, "title": data.get("title", "")})


@bp.get("/stats/overview")
@cache.cached(timeout=60, query_string=True)
def stats_overview():
    """Return pre-aggregated stats. Optional ?event_title= to filter by event."""
    event_title = request.args.get("event_title")
    if event_title:
        sql = """
            SELECT
                COUNT(*) as total_matches,
                SUM(CASE WHEN winning_team = 0 THEN 1 ELSE 0 END) as amber_wins,
                SUM(CASE WHEN winning_team = 1 THEN 1 ELSE 0 END) as sapphire_wins,
                ROUND(AVG(duration_s), 0) as avg_duration,
                MAX(duration_s) as max_duration,
                MIN(CASE WHEN duration_s > 0 THEN duration_s END) as min_duration
            FROM matches
            WHERE event_title = ?
        """
        params = (event_title,)
    else:
        sql = """
            SELECT
                COUNT(*) as total_matches,
                SUM(CASE WHEN winning_team = 0 THEN 1 ELSE 0 END) as amber_wins,
                SUM(CASE WHEN winning_team = 1 THEN 1 ELSE 0 END) as sapphire_wins,
                ROUND(AVG(duration_s), 0) as avg_duration,
                MAX(duration_s) as max_duration,
                MIN(CASE WHEN duration_s > 0 THEN duration_s END) as min_duration
            FROM matches
        """
        params = ()
    with get_ro_conn() as conn:
        cur = conn.execute(sql, params)
        row = cur.fetchone()
        cols = [c[0] for c in cur.description]
        return jsonify({"overview": dict(zip(cols, row))})


@bp.get("/stats/weekly")
@cache.cached(timeout=120, query_string=True)
def stats_weekly():
    """Return per-week aggregated stats for an event. ?event_title= defaults to Night Shift."""
    event_title = request.args.get("event_title", "Night Shift")
    with get_ro_conn() as conn:
        cur = conn.execute(
            """
            SELECT
                event_week,
                COUNT(*) as total_matches,
                SUM(CASE WHEN winning_team = 0 THEN 1 ELSE 0 END) as amber_wins,
                SUM(CASE WHEN winning_team = 1 THEN 1 ELSE 0 END) as sapphire_wins,
                ROUND(AVG(duration_s) / 60.0, 2) as avg_duration_min,
                ROUND(
                    100.0 * SUM(CASE WHEN winning_team = 0 THEN 1 ELSE 0 END) / COUNT(*), 1
                ) as amber_win_pct
            FROM matches
            WHERE event_title = ? AND event_week IS NOT NULL
            GROUP BY event_week
            ORDER BY event_week ASC
            """,
            (event_title,),
        )
        rows = _rows_to_dicts(cur)
    return jsonify({"weeks": rows})


@bp.get("/stats/records")
@cache.cached(timeout=120, query_string=True)
def stats_records():
    """Return single-game player records with match context. ?event_title= to filter."""
    event_title = request.args.get("event_title")
    where = "WHERE m.event_title = ?" if event_title else ""
    params = (event_title,) if event_title else ()

    def best(order_col):
        sql = f"""
            SELECT
                p.{order_col} as value,
                u.persona_name,
                p.account_id,
                p.hero_id,
                p.match_id,
                m.duration_s,
                m.event_week
            FROM players p
            JOIN matches m ON m.match_id = p.match_id
            LEFT JOIN users u ON u.account_id = p.account_id
            {where}
            ORDER BY p.{order_col} DESC
            LIMIT 5
        """
        return sql

    records = {}
    stat_keys = [
        ("kills",          "kills"),
        ("assists",        "assists"),
        ("deaths",         "deaths"),
        ("obj_damage",     "obj_damage"),
        ("player_healing", "healing"),
        ("net_worth",      "souls"),
    ]
    with get_ro_conn() as conn:
        for col, key in stat_keys:
            cur = conn.execute(best(col), params)
            rows = cur.fetchall()
            if rows:
                cols = [c[0] for c in cur.description]
                records[key] = [dict(zip(cols, row)) for row in rows]

    return jsonify({"records": records})


@bp.get("/stats/averages")
@cache.cached(timeout=120, query_string=True)
def stats_averages():
    """Return top players by average stat per game, min 5 games. ?event_title= to filter."""
    event_title = request.args.get("event_title")
    where = "WHERE m.event_title = ?" if event_title else ""
    hero_where = "WHERE m2.event_title = ?" if event_title else ""
    params = (event_title, event_title) if event_title else ()

    def best_avg(stat_col):
        return f"""
            SELECT
                ROUND(AVG(p.{stat_col}), 2) as value,
                u.persona_name,
                p.account_id,
                COUNT(*) as games_played,
                (SELECT p2.hero_id FROM players p2
                 JOIN matches m2 ON m2.match_id = p2.match_id
                 {hero_where}
                 AND p2.account_id = p.account_id
                 GROUP BY p2.hero_id
                 ORDER BY COUNT(*) DESC
                 LIMIT 1) as top_hero_id
            FROM players p
            JOIN matches m ON m.match_id = p.match_id
            LEFT JOIN users u ON u.account_id = p.account_id
            {where}
            GROUP BY p.account_id
            HAVING COUNT(*) >= 5
            ORDER BY AVG(p.{stat_col}) DESC
            LIMIT 5
        """

    averages = {}
    stat_keys = [
        ("kills",          "kills"),
        ("assists",        "assists"),
        ("deaths",         "deaths"),
        ("obj_damage",     "obj_damage"),
        ("player_healing", "healing"),
        ("net_worth",      "souls"),
    ]
    with get_ro_conn() as conn:
        for col, key in stat_keys:
            cur = conn.execute(best_avg(col), params)
            rows = cur.fetchall()
            if rows:
                cols = [c[0] for c in cur.description]
                averages[key] = [dict(zip(cols, row)) for row in rows]

    return jsonify({"averages": averages})


@bp.get("/matches/latest")
@cache.cached(timeout=30)
def latest_matches():  # type: ignore
    limit = int(current_app.config.get("API_LATEST_LIMIT", 50))
    with get_ro_conn() as conn:
        cur = conn.execute(
            "SELECT match_id, duration_s, winning_team, match_outcome, game_mode, match_mode, start_time, created_at "
            "FROM matches ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        data = _rows_to_dicts(cur)
        return jsonify({"matches": data})

@bp.get("/matches/latest/paged")
@cache.cached(timeout=20, query_string=True)
def latest_matches_paged():  # type: ignore
    try:
        page = max(1, int(request.args.get("page", 1)))
    except Exception:
        page = 1
    try:
        per_page = max(1, min(20, int(request.args.get("per_page", 20))))
    except Exception:
        per_page = 25
    order = (request.args.get("order") or "desc").lower()
    order = "asc" if order == "asc" else "desc"
    team = request.args.get("team") or ""
    gm = request.args.get("game_mode") or ""
    mm = request.args.get("match_mode") or ""
    hero_filter = request.args.get("hero") or ""
    player_filter = request.args.get("player") or ""

    offset = (page - 1) * per_page
    params = []
    sql_base = "FROM matches m"
    joins = ""
    conds = []
    if team in ("0", "1"):
        conds.append("m.winning_team = ?")
        params.append(int(team))
    if gm:
        conds.append("m.game_mode = ?")
        params.append(gm)
    if mm:
        conds.append("m.match_mode = ?")
        params.append(mm)

    # Hero filter: resolve name to hero_ids, then JOIN players table
    if hero_filter:
        from heroes import get_all_hero_names
        hero_ids = []
        for hid, hname in get_all_hero_names().items():
            if hero_filter.lower() in hname.lower():
                hero_ids.append(int(hid))
        if hero_ids:
            placeholders = ",".join("?" * len(hero_ids))
            joins += f" JOIN players hp ON hp.match_id = m.match_id AND hp.hero_id IN ({placeholders})"
            params = list(hero_ids) + params
        else:
            # No matching hero — return empty
            return jsonify({
                "matches": [], "page": page, "per_page": per_page,
                "total": 0, "total_pages": 0
            })

    # Player filter: JOIN users table
    if player_filter:
        joins += " JOIN players pp ON pp.match_id = m.match_id JOIN users pu ON pu.account_id = pp.account_id AND pu.persona_name LIKE ?"
        params.append(f"%{player_filter}%")

    where = (" WHERE " + " AND ".join(conds)) if conds else ""
    with get_ro_conn() as conn:
        # total count for this filter
        ccur = conn.execute(f"SELECT COUNT(DISTINCT m.match_id) {sql_base}{joins}{where}", tuple(params))
        total = ccur.fetchone()[0]
        cur = conn.execute(
            f"SELECT DISTINCT m.match_id, m.duration_s, m.winning_team, m.match_outcome, m.game_mode, m.match_mode, m.start_time, m.created_at {sql_base}{joins}{where} "
            f"ORDER BY COALESCE(m.start_time, m.created_at) {'ASC' if order == 'asc' else 'DESC'} LIMIT ? OFFSET ?",
            tuple(params + [per_page, offset])
        )
        matches = _rows_to_dicts(cur)

        # Fetch players for each match to include hero data
        match_ids = [m["match_id"] for m in matches]
        if match_ids:
            placeholders = ",".join("?" * len(match_ids))
            pcur = conn.execute(
                f"SELECT p.match_id, p.team, p.hero_id, u.persona_name, p.account_id "
                f"FROM players p LEFT JOIN users u ON u.account_id = p.account_id "
                f"WHERE p.match_id IN ({placeholders}) ORDER BY p.team, p.player_slot",
                tuple(match_ids)
            )
            players_by_match = {}
            for row in _rows_to_dicts(pcur):
                mid = row["match_id"]
                if mid not in players_by_match:
                    players_by_match[mid] = []
                if row.get("hero_id"):
                    row["hero_name"] = get_hero_name(row["hero_id"])
                players_by_match[mid].append(row)
            for m in matches:
                m["players"] = players_by_match.get(m["match_id"], [])

        return jsonify({
            "matches": matches,
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page
        })


@bp.get("/matches/<int:match_id>/adjacent")
@cache.cached(timeout=60)
def match_adjacent(match_id: int):  # type: ignore
    with get_ro_conn() as conn:
        cur_row = conn.execute(
            "SELECT start_time, winning_team, event_title, event_week FROM matches WHERE match_id = ?",
            (match_id,),
        ).fetchone()
        prev_row = conn.execute(
            "SELECT match_id FROM matches WHERE created_at > "
            "(SELECT created_at FROM matches WHERE match_id = ?) "
            "ORDER BY created_at ASC LIMIT 1",
            (match_id,),
        ).fetchone()
        next_row = conn.execute(
            "SELECT match_id FROM matches WHERE created_at < "
            "(SELECT created_at FROM matches WHERE match_id = ?) "
            "ORDER BY created_at DESC LIMIT 1",
            (match_id,),
        ).fetchone()
    return jsonify({
        "start_time": cur_row[0] if cur_row else None,
        "winning_team": cur_row[1] if cur_row else None,
        "event_title": cur_row[2] if cur_row else None,
        "event_week": cur_row[3] if cur_row else None,
        "previous_match_id": prev_row[0] if prev_row else None,
        "next_match_id": next_row[0] if next_row else None,
    })


@bp.get("/matches/<int:match_id>/players")
@cache.cached(timeout=60)
def match_players(match_id: int):  # type: ignore
    with get_ro_conn() as conn:
        cur = conn.execute(
            "SELECT p.*, u.persona_name FROM players p "
            "LEFT JOIN users u ON u.account_id = p.account_id "
            "WHERE p.match_id = ? ORDER BY p.team, p.player_slot",
            (match_id,),
        )
        data = _rows_to_dicts(cur)
        
        
        return jsonify({"players": data})

@bp.get("/matches/<int:match_id>/items")
@cache.cached(timeout=86400)
def match_items(match_id: int):  # type: ignore
    # Fetch item catalog (cached 10 min).
    # If the cache is cold, do a short-timeout fetch so we don't block Flask's
    # single-threaded dev server long enough to cause an ECONNRESET at the proxy.
    item_catalog = cache.get("dlns_items_list")
    if item_catalog is None:
        try:
            resp = requests.get(
                "https://assets.deadlock-api.com/v2/items",
                params={"language": "english"},
                timeout=3,
            )
            resp.raise_for_status()
            item_catalog = resp.json()
            cache.set("dlns_items_list", item_catalog, timeout=600)
        except Exception as e:
            current_app.logger.warning("Item catalog unavailable: %s", e)
            return jsonify({})

    # Build id -> {name, item_slot_type, item_tier} lookup
    item_lookup: dict = {}
    for item in (item_catalog if isinstance(item_catalog, list) else []):
        iid = item.get("id")
        if iid is not None:
            item_lookup[int(iid)] = {
                "name": item.get("name", ""),
                "item_slot_type": item.get("item_slot_type", ""),
                "item_tier": item.get("item_tier"),
            }

    with get_ro_conn() as conn:
        cur = conn.execute(
            "SELECT account_id, items FROM players WHERE match_id = ?",
            (match_id,),
        )
        rows = cur.fetchall()

    result: dict = {}
    for account_id, items_json in rows:
        if not items_json:
            continue
        try:
            item_ids = json.loads(items_json)
        except Exception:
            continue
        enriched = []
        seen_ids: set = set()
        for iid in item_ids:
            iid_int = int(iid)
            if iid_int in seen_ids:
                continue
            seen_ids.add(iid_int)
            meta = item_lookup.get(iid_int)
            if meta and meta.get("name"):
                enriched.append(meta)
        # Sort higher-tier items first, then cap at 12 to handle existing data
        # where sold/consumed items may have been stored with sold_time_s=0.
        enriched.sort(key=lambda x: x.get("item_tier") or 0, reverse=True)
        enriched = enriched[:12]
        if enriched:
            result[str(account_id)] = enriched

    return jsonify(result)


@bp.get("/matches/<int:match_id>/users/<int:account_id>")
@cache.cached(timeout=60)
def match_user_stats(match_id: int, account_id: int):  # type: ignore
    with get_ro_conn() as conn:
        cur = conn.execute(
            "SELECT p.*, u.persona_name FROM players p "
            "LEFT JOIN users u ON u.account_id = p.account_id "
            "WHERE p.match_id = ? AND p.account_id = ?",
            (match_id, account_id),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "not_found"}), 404
        cols = [c[0] for c in cur.description]
        player_data = dict(zip(cols, row))
        
        # Enhance with hero name
        if player_data.get('hero_id'):
            player_data['hero_name'] = get_hero_name(player_data['hero_id'])
        
        return jsonify({"player": player_data})


@bp.get("/users/<int:account_id>")
@cache.cached(timeout=120)
def user_info(account_id: int):  # type: ignore
    with get_ro_conn() as conn:
        cur = conn.execute(
            "SELECT account_id, persona_name, updated_at FROM users WHERE account_id = ?",
            (account_id,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "not_found"}), 404
        return jsonify({"user": {"account_id": row[0], "persona_name": row[1], "updated_at": row[2]}})


@bp.get("/users/<int:account_id>/stats")
@cache.cached(timeout=120)
def user_stats(account_id: int):  # type: ignore
    with get_ro_conn() as conn:
        cur = conn.execute(
            "SELECT * FROM user_stats WHERE account_id = ?",
            (account_id,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"stats": None})
        cols = [c[0] for c in cur.description]
        return jsonify({"stats": dict(zip(cols, row))})


@bp.get("/users/<int:account_id>/matches")
@cache.cached(timeout=60, query_string=True)
def user_matches_api(account_id: int):
    with get_ro_conn() as conn:
        cur = conn.execute(
            "SELECT p.match_id, p.team, p.result, p.hero_id, p.kills, p.deaths, p.assists, p.last_hits, p.denies, p.creep_kills, p.shots_hit, p.shots_missed, p.player_damage, p.obj_damage, p.player_healing, p.pings_count, m.duration_s, m.winning_team, m.game_mode, m.match_mode, m.start_time, m.created_at "
            "FROM players p JOIN matches m ON m.match_id = p.match_id WHERE p.account_id = ? ORDER BY m.created_at DESC",
            (account_id,),
        )
        data = _rows_to_dicts(cur)
        
        # Enhance with hero names
        for match in data:
            if match.get('hero_id'):
                match['hero_name'] = get_hero_name(match['hero_id'])
        
        return jsonify({"matches": data})

@bp.get("/users/<int:account_id>/matches/paged")
@cache.cached(timeout=60, query_string=True)
def user_matches_paged_api(account_id: int):
    order = (request.args.get("order") or "desc").lower()
    order = "asc" if order == "asc" else "desc"
    res = (request.args.get("res") or "").lower()  # win|loss|''
    teamf = request.args.get("team") or ""
    try:
        page = max(1, int(request.args.get("page", 1)))
    except Exception:
        page = 1
    try:
        per_page = max(1, min(20, int(request.args.get("per_page", 20))))
    except Exception:
        per_page = 25
    offset = (page - 1) * per_page

    params: List[Any] = [account_id]
    conds: List[str] = []
    if res in ("win", "loss"):
        conds.append("p.result = ?")
        params.append("Win" if res == "win" else "Loss")
    if teamf in ("0", "1"):
        conds.append("p.team = ?")
        params.append(int(teamf))

    where = " WHERE p.account_id = ?" + (" AND " + " AND ".join(conds) if conds else "")
    with get_ro_conn() as conn:
        ccur = conn.execute(
            "SELECT COUNT(1) FROM players p JOIN matches m ON m.match_id = p.match_id" + where,
            tuple(params)
        )
        total = ccur.fetchone()[0]
        cur = conn.execute(
            "SELECT p.match_id, p.team, p.result, p.hero_id, p.kills, p.deaths, p.assists, p.creep_kills, p.last_hits, p.denies, p.shots_hit, p.shots_missed, p.player_damage, p.obj_damage, p.player_healing, p.pings_count, m.duration_s, m.winning_team, m.start_time, m.created_at "
            "FROM players p JOIN matches m ON m.match_id = p.match_id" + where +
            f" ORDER BY COALESCE(m.start_time, m.created_at) {'ASC' if order == 'asc' else 'DESC'} LIMIT ? OFFSET ?",
            tuple(params + [per_page, offset])
        )
        data = _rows_to_dicts(cur)
        
        # Enhance with hero names
        for match in data:
            if match.get('hero_id'):
                match['hero_name'] = get_hero_name(match['hero_id'])
        
        return jsonify({
            "matches": data,
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page
        })

@bp.get("/search/suggest")
@cache.cached(timeout=20, query_string=True)
def search_suggest():  # type: ignore
    q = (request.args.get("q") or "").strip()
    if not q:
        return jsonify({"results": []})
    results = []
    with get_ro_conn() as conn:
        if q.isdigit():
            # Suggest recent matches whose ID starts with the typed digits
            cur = conn.execute(
                "SELECT match_id FROM matches WHERE CAST(match_id AS TEXT) LIKE ? ORDER BY created_at DESC LIMIT 10",
                (f"{q}%",),
            )
            rows = cur.fetchall()
            results = [
                {"type": "match", "text": str(r[0]), "url": f"/matches/{r[0]}"}
                for r in rows
            ]
        else:
            # Suggest user names starting with query (prefix match for better perf)
            cur = conn.execute(
                "SELECT account_id, persona_name FROM users WHERE persona_name LIKE ? ORDER BY persona_name LIMIT 10",
                (f"{q}%",),
            )
            rows = cur.fetchall()
            results = [
                {"type": "user", "text": r[1], "url": f"/users/{r[0]}"}
                for r in rows
            ]
    return jsonify({"results": results})

@bp.get("/heroes")
@cache.cached(timeout=300)  # Cache for 5 minutes
def get_heroes():
    """Return hero ID to name mapping for JavaScript."""
    from heroes import _load_if_needed, _names, _lock
    
    with _lock:
        _load_if_needed()
        # Return the heroes dict directly - this will be the flat ID->name mapping
        return jsonify(_names)


@bp.get("/heroes/<int:hero_id>/stats")
@cache.cached(timeout=120)
def hero_stats(hero_id: int):
    """Return aggregated stats for a specific hero across all matches."""
    with get_ro_conn() as conn:
        cur = conn.execute(
            """
            SELECT
                COUNT(*) as games_played,
                SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) as wins,
                ROUND(AVG(kills), 2) as avg_kills,
                ROUND(AVG(deaths), 2) as avg_deaths,
                ROUND(AVG(assists), 2) as avg_assists,
                ROUND(AVG(CAST(kills + assists AS REAL) / MAX(deaths, 1)), 2) as avg_kda,
                ROUND(AVG(player_damage), 0) as avg_damage,
                ROUND(AVG(obj_damage), 0) as avg_obj_damage,
                ROUND(AVG(player_healing), 0) as avg_healing,
                ROUND(AVG(net_worth), 0) as avg_souls,
                MAX(kills) as max_kills,
                MAX(player_damage) as max_damage,
                MAX(player_healing) as max_healing,
                MAX(obj_damage) as max_obj_damage
            FROM players
            WHERE hero_id = ?
            """,
            (hero_id,)
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"stats": None})
        cols = [c[0] for c in cur.description]
        stats = dict(zip(cols, row))

        # Pick rate = hero games / total match-player rows
        total_cur = conn.execute("SELECT COUNT(*) FROM players WHERE account_id IS NOT NULL")
        total = total_cur.fetchone()[0]
        stats["pick_rate"] = round(stats["games_played"] / total, 4) if total else 0
        stats["win_rate"] = round(stats["wins"] / stats["games_played"], 4) if stats["games_played"] else 0

        return jsonify({"stats": stats})


@bp.get("/heroes/<int:hero_id>/top_items")
@cache.cached(timeout=120)
def hero_top_items(hero_id: int):
    """Return most-purchased items for a specific hero, ranked by frequency."""
    # Reuse cached item catalog
    item_catalog = cache.get("dlns_items_list")
    if item_catalog is None:
        try:
            resp = requests.get(
                "https://assets.deadlock-api.com/v2/items",
                params={"language": "english"},
                timeout=3,
            )
            resp.raise_for_status()
            item_catalog = resp.json()
            cache.set("dlns_items_list", item_catalog, timeout=600)
        except Exception as e:
            current_app.logger.warning("Item catalog unavailable: %s", e)
            return jsonify({"items": []})

    item_lookup: dict = {}
    for item in (item_catalog if isinstance(item_catalog, list) else []):
        iid = item.get("id")
        if iid is not None:
            item_lookup[int(iid)] = {
                "name": item.get("name", ""),
                "item_slot_type": item.get("item_slot_type", ""),
                "item_tier": item.get("item_tier"),
                "shopable": item.get("shopable", False),
                "cost": item.get("cost", 0),
            }

    with get_ro_conn() as conn:
        cur = conn.execute(
            "SELECT items FROM players WHERE hero_id = ? AND items IS NOT NULL",
            (hero_id,),
        )
        rows = cur.fetchall()

    from collections import Counter
    counts: Counter = Counter()
    total_games = 0
    for (items_json,) in rows:
        try:
            item_ids = json.loads(items_json)
        except Exception:
            continue
        total_games += 1
        for iid in item_ids:
            try:
                counts[int(iid)] += 1
            except (ValueError, TypeError):
                pass

    result = []
    for iid, count in counts.most_common(50):
        meta = item_lookup.get(iid)
        if not meta or not meta.get("name"):
            continue
        # Skip abilities and non-purchasable entries
        if not meta.get("shopable") and not (meta.get("cost") or 0) > 0:
            continue
        result.append({
            "id": iid,
            "name": meta["name"],
            "item_slot_type": meta["item_slot_type"],
            "item_tier": meta["item_tier"],
            "count": count,
            "pick_rate": round(count / total_games, 4) if total_games else 0,
        })
        if len(result) == 10:
            break

    return jsonify({"items": result, "total_games": total_games})


@bp.get("/heroes/<int:hero_id>/matchups")
@cache.cached(timeout=120)
def hero_matchups(hero_id: int):
    """Return heroes most effective with/against a specific hero."""
    MIN_GAMES = 3
    with get_ro_conn() as conn:
        # Most effective WITH (same team, ranked by win rate)
        with_cur = conn.execute(
            """
            SELECT
                ally.hero_id,
                COUNT(*) as games,
                SUM(CASE WHEN p.result = 'Win' THEN 1 ELSE 0 END) as wins
            FROM players p
            JOIN players ally
                ON ally.match_id = p.match_id
                AND ally.team = p.team
                AND ally.hero_id != p.hero_id
            WHERE p.hero_id = ?
            GROUP BY ally.hero_id
            HAVING games >= ?
            ORDER BY CAST(wins AS REAL) / games DESC
            LIMIT 5
            """,
            (hero_id, MIN_GAMES),
        )
        with_rows = _rows_to_dicts(with_cur)

        # Most effective AGAINST (opposite team, ranked by win rate)
        against_cur = conn.execute(
            """
            SELECT
                opp.hero_id,
                COUNT(*) as games,
                SUM(CASE WHEN p.result = 'Win' THEN 1 ELSE 0 END) as wins
            FROM players p
            JOIN players opp
                ON opp.match_id = p.match_id
                AND opp.team != p.team
            WHERE p.hero_id = ?
            GROUP BY opp.hero_id
            HAVING games >= ?
            ORDER BY CAST(wins AS REAL) / games DESC
            LIMIT 5
            """,
            (hero_id, MIN_GAMES),
        )
        against_rows = _rows_to_dicts(against_cur)

    def enrich(rows):
        for r in rows:
            gp = r["games"] or 0
            r["win_rate"] = round(r["wins"] / gp, 4) if gp else 0
        return rows

    return jsonify({
        "effective_with": enrich(with_rows),
        "effective_against": enrich(against_rows),
    })


@bp.get("/heroes/<int:hero_id>/top_players")
@cache.cached(timeout=120)
def hero_top_players(hero_id: int):
    """Return top players by games played on a specific hero."""
    with get_ro_conn() as conn:
        cur = conn.execute(
            """
            SELECT
                p.account_id,
                u.persona_name,
                COUNT(*) as games_played,
                SUM(CASE WHEN p.result = 'Win' THEN 1 ELSE 0 END) as wins
            FROM players p
            LEFT JOIN users u ON u.account_id = p.account_id
            WHERE p.hero_id = ? AND p.account_id IS NOT NULL
            GROUP BY p.account_id, u.persona_name
            ORDER BY games_played DESC
            LIMIT 10
            """,
            (hero_id,)
        )
        rows = _rows_to_dicts(cur)
        for row in rows:
            gp = row["games_played"] or 0
            row["win_rate"] = round(row["wins"] / gp, 4) if gp else 0
        return jsonify({"players": rows})


@bp.get("/heroes/<int:hero_id>/meta")
@cache.cached(timeout=60)
def hero_meta(hero_id: int):
    """Return curated metadata (tagline + abilities) for a specific hero."""
    meta_path = Path(current_app.root_path) / "data" / "hero_meta.json"
    try:
        with open(meta_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return jsonify({"error": "meta data unavailable"}), 503

    entry = data.get(str(hero_id))
    if entry is None:
        return jsonify({"error": "not found"}), 404

    return jsonify(entry)


@bp.get("/players")
@cache.cached(timeout=60)  # Cache for 1 minute
def get_players():
    """Return list of all players from match data with their match count."""
    with get_ro_conn() as conn:
        cur = conn.execute(
            """
            SELECT 
                p.account_id,
                u.persona_name,
                COUNT(DISTINCT p.match_id) as match_count
            FROM players p
            LEFT JOIN users u ON u.account_id = p.account_id
            WHERE p.account_id IS NOT NULL
            GROUP BY p.account_id, u.persona_name
            ORDER BY match_count DESC, u.persona_name ASC
            LIMIT 500
            """
        )
        players = _rows_to_dicts(cur)
        return jsonify({"players": players})
