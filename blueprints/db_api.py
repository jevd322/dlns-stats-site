from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

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
