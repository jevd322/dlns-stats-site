from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from flask import Blueprint, render_template, current_app, jsonify, request
from utils.auth import require_admin, get_current_user, get_all_privileged_users, is_admin
from main import (
    SkipMatchSilent,
    db_connect,
    db_init,
    fetch_match_metadata,
    parse_time_to_iso,
    recompute_user_stats_bulk,
    team_from_slot,
    upsert_match,
    upsert_player,
)

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

_jobs: Dict[str, Dict[str, Any]] = {}
_jobs_lock = threading.Lock()
_matches_json_lock = threading.Lock()


def _matches_json_path() -> Path:
    return Path(current_app.root_path).parent / "matches.json"


def _load_matches_json(matches_path: Path) -> Dict[str, Any]:
    try:
        with matches_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        data = {"series": []}

    if not isinstance(data, dict) or not isinstance(data.get("series"), list):
        data = {"series": []}
    return data


def _write_matches_json(matches_path: Path, data: Dict[str, Any]) -> None:
    tmp = matches_path.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    tmp.replace(matches_path)


def _find_match_location(data: Dict[str, Any], match_id: int) -> Optional[Dict[str, int]]:
    series_list = data.get("series") or []
    for si, series in enumerate(series_list):
        for wi, week in enumerate(series.get("weeks") or []):
            for gi, game in enumerate(week.get("games") or []):
                for mi, match in enumerate(game.get("matches") or []):
                    try:
                        mid = int(match.get("match_id"))
                    except Exception:
                        continue
                    if mid == match_id:
                        return {"si": si, "wi": wi, "gi": gi, "mi": mi}
    return None


def _build_match_tree(data: Dict[str, Any]) -> Dict[str, Any]:
    series_nodes: List[Dict[str, Any]] = []
    for series in data.get("series") or []:
        title = (series.get("title") or "").strip()
        week_nodes: List[Dict[str, Any]] = []

        for week in series.get("weeks") or []:
            week_num = int(week.get("week") or 0)
            vod_link = week.get("vod_link") or ""
            game_nodes: List[Dict[str, Any]] = []

            for game in week.get("games") or []:
                team_a = (game.get("team_a") or "").strip()
                team_b = (game.get("team_b") or "").strip()
                match_nodes: List[Dict[str, Any]] = []

                for match in game.get("matches") or []:
                    try:
                        match_id = int(match.get("match_id"))
                    except Exception:
                        continue

                    game_label = (match.get("game") or f"Game {len(match_nodes) + 1}").strip()
                    try:
                        team_a_side = int(match.get("team_a_side") or 0)
                    except Exception:
                        team_a_side = 0

                    match_nodes.append(
                        {
                            "match_id": match_id,
                            "game": game_label,
                            "team_a_side": team_a_side,
                            "context": {
                                "series_title": title,
                                "week": week_num,
                                "vod_link": vod_link,
                                "team_a": team_a,
                                "team_b": team_b,
                                "game_label": game_label,
                            },
                        }
                    )

                game_nodes.append(
                    {
                        "team_a": team_a,
                        "team_b": team_b,
                        "match_count": len(match_nodes),
                        "matches": match_nodes,
                    }
                )

            week_nodes.append(
                {
                    "week": week_num,
                    "vod_link": vod_link,
                    "game_count": len(game_nodes),
                    "games": game_nodes,
                }
            )

        series_nodes.append(
            {
                "title": title,
                "week_count": len(week_nodes),
                "weeks": week_nodes,
            }
        )

    return {"series": series_nodes}


def _apply_match_edit(
    data: Dict[str, Any],
    *,
    match_id: int,
    series_title: str,
    week: int,
    team_a: str,
    team_b: str,
    game_label: str,
    team_a_side: int,
    vod_link: str,
) -> Dict[str, Any]:
    loc = _find_match_location(data, match_id)
    if not loc:
        raise ValueError(f"Match {match_id} was not found in matches.json")

    series_list = data.setdefault("series", [])
    old_series = series_list[loc["si"]]
    old_weeks = old_series.setdefault("weeks", [])
    old_week = old_weeks[loc["wi"]]
    old_games = old_week.setdefault("games", [])
    old_game = old_games[loc["gi"]]
    old_matches = old_game.setdefault("matches", [])
    match_entry = old_matches.pop(loc["mi"])

    if not old_matches:
        old_games.pop(loc["gi"])
    if not old_games:
        old_weeks.pop(loc["wi"])
    if not old_weeks:
        series_list.pop(loc["si"])

    target_series = next((s for s in series_list if (s.get("title") or "").strip() == series_title), None)
    if target_series is None:
        target_series = {"title": series_title, "weeks": []}
        series_list.append(target_series)

    target_weeks = target_series.setdefault("weeks", [])
    target_week = next((w for w in target_weeks if int(w.get("week") or -1) == int(week)), None)
    if target_week is None:
        target_week = {"week": int(week), "games": []}
        target_weeks.append(target_week)

    target_week["vod_link"] = vod_link or ""
    target_games = target_week.setdefault("games", [])
    target_game = next(
        (g for g in target_games if (g.get("team_a") or "").strip() == team_a and (g.get("team_b") or "").strip() == team_b),
        None,
    )
    if target_game is None:
        target_game = {"team_a": team_a, "team_b": team_b, "matches": []}
        target_games.append(target_game)

    target_matches = target_game.setdefault("matches", [])
    target_matches[:] = [m for m in target_matches if int(m.get("match_id") or -1) != int(match_id)]

    match_entry["match_id"] = int(match_id)
    match_entry["game"] = game_label
    match_entry["team_a_side"] = int(team_a_side)
    target_matches.append(match_entry)

    return {
        "match_id": int(match_id),
        "series_title": series_title,
        "week": int(week),
        "team_a": team_a,
        "team_b": team_b,
        "game_label": game_label,
        "team_a_side": int(team_a_side),
        "vod_link": vod_link or "",
    }


def _set_job(job_id: str, **updates: Any) -> None:
    with _jobs_lock:
        existing = _jobs.get(job_id, {})
        existing.update(updates)
        _jobs[job_id] = existing


def _normalize_name(value: str) -> str:
    return (value or "").strip().lower()


def _winner_hint_to_team_a_side(
    winner_hint: Optional[str],
    team_a: str,
    team_b: str,
    api_winning_team: Optional[int],
) -> Optional[int]:
    if winner_hint is None:
        return None
    if api_winning_team not in (0, 1):
        return None

    winner = _normalize_name(winner_hint)
    a = _normalize_name(team_a)
    b = _normalize_name(team_b)

    if winner in {"amber", "team_a", "a", a}:
        return int(api_winning_team)
    if winner in {"sapphire", "team_b", "b", b}:
        return 1 - int(api_winning_team)
    return None


def _detect_team_a_side_from_history(
    conn: sqlite3.Connection,
    players: List[Dict[str, Any]],
    team_a: str,
) -> Optional[int]:
    rows = conn.execute(
        """
        SELECT DISTINCT p.account_id
        FROM players p
        JOIN matches m ON m.match_id = p.match_id
        WHERE m.event_team_a = ?
        """,
        (team_a,),
    ).fetchall()
    if not rows:
        return None

    known_ids = {int(r[0]) for r in rows if r[0] is not None}
    if not known_ids:
        return None

    amber_count = 0
    sapphire_count = 0
    for p in players:
        account_id = p.get("account_id")
        if account_id is None:
            continue
        try:
            aid = int(account_id)
        except Exception:
            continue
        if aid not in known_ids:
            continue
        side = team_from_slot(p.get("player_slot"))
        if side == 0:
            amber_count += 1
        elif side == 1:
            sapphire_count += 1

    total = amber_count + sapphire_count
    if total < 2:
        return None
    return 0 if amber_count >= sapphire_count else 1


def _upsert_matches_json(
    matches_path: Path,
    series_title: str,
    week: int,
    vod_link: str,
    items: List[Dict[str, Any]],
) -> None:
    with _matches_json_lock:
        data: Dict[str, Any]
        try:
            with matches_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            data = {"series": []}

        if not isinstance(data, dict) or not isinstance(data.get("series"), list):
            data = {"series": []}

        series_list: List[Dict[str, Any]] = data["series"]
        series_obj = next((s for s in series_list if s.get("title") == series_title), None)
        if series_obj is None:
            series_obj = {"title": series_title, "weeks": []}
            series_list.append(series_obj)

        weeks = series_obj.setdefault("weeks", [])
        week_obj = next((w for w in weeks if int(w.get("week", -1)) == int(week)), None)
        if week_obj is None:
            week_obj = {"week": int(week), "games": []}
            weeks.append(week_obj)

        if vod_link:
            week_obj["vod_link"] = vod_link

        games = week_obj.setdefault("games", [])
        for item in items:
            team_a = item["team_a"]
            team_b = item["team_b"]
            match_id = int(item["match_id"])
            game_label = item["game_label"]
            team_a_side = item["team_a_side"]

            game_obj = next(
                (g for g in games if g.get("team_a") == team_a and g.get("team_b") == team_b),
                None,
            )
            if game_obj is None:
                game_obj = {"team_a": team_a, "team_b": team_b, "matches": []}
                games.append(game_obj)

            matches = game_obj.setdefault("matches", [])
            existing = next((m for m in matches if int(m.get("match_id", -1)) == match_id), None)
            if existing:
                existing["game"] = game_label
                existing["team_a_side"] = int(team_a_side)
            else:
                matches.append({
                    "game": game_label,
                    "match_id": match_id,
                    "team_a_side": int(team_a_side),
                })

        tmp = matches_path.with_suffix(".json.tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        tmp.replace(matches_path)


def _run_bulk_submit_job(job_id: str, payload: Dict[str, Any], app_obj: Any) -> None:
    try:
        with app_obj.app_context():
            _set_job(job_id, status="running", message="Processing matches")

            db_path = Path(current_app.config.get("DB_PATH", "./data/dlns.sqlite3"))
            conn = db_connect(db_path)
            db_init(conn)
            matches_path = Path(current_app.root_path).parent / "matches.json"

            series_title = payload["title"]
            week = int(payload["week"])
            vod_link = (payload.get("vod_link") or "").strip()
            sets = payload["sets"]

            account_ids: set[int] = set()
            matches_for_json: List[Dict[str, Any]] = []

            for set_item in sets:
                team_a = set_item["team_a"]
                team_b = set_item["team_b"]
                matches = set_item["matches"]

                for idx, match in enumerate(matches, start=1):
                    match_id = int(match["match_id"])
                    winner_hint = match.get("winner")
                    game_label = (match.get("game") or f"Game {idx}").strip()

                    try:
                        mi = fetch_match_metadata(match_id)
                    except SkipMatchSilent:
                        raise ValueError(f"Match {match_id} is not indexed by the API yet.")

                    players = mi.get("players") or []
                    if not isinstance(players, list) or not players:
                        raise ValueError(f"Match {match_id} returned no players.")

                    side = _winner_hint_to_team_a_side(
                        winner_hint,
                        team_a,
                        team_b,
                        mi.get("winning_team"),
                    )
                    if side is None:
                        side = _detect_team_a_side_from_history(conn, players, team_a)
                    if side is None:
                        raise ValueError(
                            f"Could not determine team_a_side for match {match_id}. "
                            "Set winner explicitly for this match (team name, amber, or sapphire)."
                        )

                    upsert_match(
                        conn,
                        mi,
                        event_title=series_title,
                        event_week=week,
                        event_team_a=team_a,
                        event_team_b=team_b,
                        event_game=game_label,
                        event_team_a_ingame_side=side,
                    )

                    winning_team = mi.get("winning_team")
                    for player in players:
                        account_id = player.get("account_id")
                        if account_id is not None:
                            try:
                                account_ids.add(int(account_id))
                            except Exception:
                                pass
                        upsert_player(conn, match_id, player, winning_team, {})

                    matches_for_json.append(
                        {
                            "team_a": team_a,
                            "team_b": team_b,
                            "match_id": match_id,
                            "game_label": game_label,
                            "team_a_side": int(side),
                        }
                    )

            recompute_user_stats_bulk(conn, list(account_ids))
            conn.commit()
            conn.close()

            _upsert_matches_json(matches_path, series_title, week, vod_link, matches_for_json)
            _set_job(job_id, status="done", message=f"Ingested {len(matches_for_json)} matches.")
    except Exception as e:
        app_obj.logger.exception("Bulk match submit failed")
        _set_job(job_id, status="error", message=str(e))

@admin_bp.route('/')
@require_admin
def admin_panel():
    """Main admin panel"""
    user = get_current_user()
    privileged_users = get_all_privileged_users()
    
    # Get some basic stats
    from blueprints.db_api import get_ro_conn
    
    stats = {}
    try:
        with get_ro_conn() as conn:
            # Check what tables exist first
            tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
            table_names = [t[0] for t in tables]
            
            # Total matches
            if 'matches' in table_names:
                stats['total_matches'] = conn.execute("SELECT COUNT(*) FROM matches").fetchone()[0]
            else:
                stats['total_matches'] = 0
            
            # Total unique players - check if match_players exists, otherwise use users table
            if 'match_players' in table_names:
                stats['total_players'] = conn.execute("SELECT COUNT(DISTINCT account_id) FROM match_players").fetchone()[0]
            elif 'users' in table_names:
                stats['total_players'] = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            else:
                stats['total_players'] = 0
            
            # Recent matches (last 7 days)
            if 'matches' in table_names:
                stats['recent_matches'] = conn.execute(
                    "SELECT COUNT(*) FROM matches WHERE created_at > datetime('now', '-7 days')"
                ).fetchone()[0]
            else:
                stats['recent_matches'] = 0
            
    except Exception as e:
        current_app.logger.error(f"Error getting admin stats: {e}")
        stats = {'total_matches': 0, 'total_players': 0, 'recent_matches': 0}
    
    return render_template(
        'admin/panel.html',
        privileged_users=privileged_users,
        user=user,
        stats=stats
    )

@admin_bp.route('/users')
@require_admin
def manage_users():
    """View privileged users (read-only since they're managed via environment)"""
    privileged_users = get_all_privileged_users()
    
    return render_template('admin/users.html', privileged_users=privileged_users)

@admin_bp.route('/logs')
@require_admin
def view_logs():
    """View system logs"""
    # You can implement log viewing here
    # For now, just return a placeholder
    return render_template('admin/logs.html')


@admin_bp.route('/matches')
@require_admin
def admin_matches_page():
    return render_template('react.html', page='match_admin')


@admin_bp.route('/match/bulk-submit', methods=['POST'])
@require_admin
def admin_bulk_submit():
    payload = request.get_json(silent=True) or {}
    title = (payload.get('title') or '').strip()
    week = payload.get('week')
    sets = payload.get('sets')

    if not title:
        return jsonify({'ok': False, 'error': 'Title is required'}), 400
    if week is None:
        return jsonify({'ok': False, 'error': 'Week is required'}), 400
    try:
        week = int(week)
    except Exception:
        return jsonify({'ok': False, 'error': 'Week must be a number'}), 400
    if not isinstance(sets, list) or not sets:
        return jsonify({'ok': False, 'error': 'At least one set is required'}), 400

    for set_item in sets:
        team_a = (set_item.get('team_a') or '').strip()
        team_b = (set_item.get('team_b') or '').strip()
        matches = set_item.get('matches')
        if not team_a or not team_b:
            return jsonify({'ok': False, 'error': 'Each set needs team_a and team_b'}), 400
        if not isinstance(matches, list) or not matches:
            return jsonify({'ok': False, 'error': 'Each set needs at least one match'}), 400
        for m in matches:
            try:
                int(m.get('match_id'))
            except Exception:
                return jsonify({'ok': False, 'error': 'Every match requires a numeric match_id'}), 400

    job_id = str(uuid.uuid4())
    _set_job(job_id, status='queued', message='Queued', submitted=len(sets))
    app_obj = current_app._get_current_object()
    thread = threading.Thread(
        target=_run_bulk_submit_job,
        args=(job_id, {'title': title, 'week': week, 'vod_link': payload.get('vod_link'), 'sets': sets}, app_obj),
        daemon=True,
    )
    thread.start()
    return jsonify({'ok': True, 'job_id': job_id})


@admin_bp.route('/match/preview', methods=['POST'])
@require_admin
def admin_match_preview():
    payload = request.get_json(silent=True) or {}
    raw_match_id = payload.get('match_id')

    try:
        match_id = int(raw_match_id)
    except Exception:
        return jsonify({'ok': False, 'error': 'match_id must be numeric'}), 400

    try:
        mi = fetch_match_metadata(match_id)
    except SkipMatchSilent:
        return jsonify({'ok': False, 'error': f'Match {match_id} is not indexed by the API yet.'}), 404
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

    players = mi.get('players') or []
    if not isinstance(players, list):
        players = []

    start_iso = parse_time_to_iso(
        mi.get('start_time')
        or mi.get('started_at')
        or mi.get('start')
        or mi.get('startTime')
        or mi.get('match_start_time')
    )

    preview_players = []
    for p in players:
        preview_players.append({
            'account_id': p.get('account_id'),
            'player_slot': p.get('player_slot'),
            'team': team_from_slot(p.get('player_slot')),
            'hero_id': p.get('hero_id'),
        })

    return jsonify(
        {
            'ok': True,
            'preview': {
                'match_id': match_id,
                'start_time': start_iso,
                'duration_s': mi.get('duration_s'),
                'winning_team': mi.get('winning_team'),
                'players': preview_players,
            },
        }
    )


@admin_bp.route('/match/job/<job_id>')
@require_admin
def admin_match_job(job_id: str):
    with _jobs_lock:
        job = _jobs.get(job_id)
    if not job:
        return jsonify({'ok': False, 'error': 'Job not found'}), 404
    return jsonify({'ok': True, **job})


@admin_bp.route('/match/tree')
@require_admin
def admin_match_tree():
    matches_path = _matches_json_path()
    with _matches_json_lock:
        data = _load_matches_json(matches_path)
    return jsonify({'ok': True, **_build_match_tree(data)})


@admin_bp.route('/match/edit', methods=['PATCH'])
@require_admin
def admin_match_edit():
    payload = request.get_json(silent=True) or {}

    try:
        match_id = int(payload.get('match_id'))
    except Exception:
        return jsonify({'ok': False, 'error': 'match_id must be numeric'}), 400

    series_title = (payload.get('series_title') or '').strip()
    team_a = (payload.get('team_a') or '').strip()
    team_b = (payload.get('team_b') or '').strip()
    game_label = (payload.get('game_label') or '').strip()
    vod_link = (payload.get('vod_link') or '').strip()

    if not series_title:
        return jsonify({'ok': False, 'error': 'series_title is required'}), 400
    if not team_a or not team_b:
        return jsonify({'ok': False, 'error': 'team_a and team_b are required'}), 400
    if not game_label:
        return jsonify({'ok': False, 'error': 'game_label is required'}), 400

    try:
        week = int(payload.get('week'))
    except Exception:
        return jsonify({'ok': False, 'error': 'week must be numeric'}), 400

    try:
        team_a_side = int(payload.get('team_a_side'))
    except Exception:
        return jsonify({'ok': False, 'error': 'team_a_side must be 0 or 1'}), 400
    if team_a_side not in (0, 1):
        return jsonify({'ok': False, 'error': 'team_a_side must be 0 or 1'}), 400

    db_path = Path(current_app.config.get('DB_PATH', './data/dlns.sqlite3'))
    matches_path = _matches_json_path()

    conn: Optional[sqlite3.Connection] = None
    try:
        conn = db_connect(db_path)
        db_init(conn)

        row = conn.execute('SELECT 1 FROM matches WHERE match_id = ?', (match_id,)).fetchone()
        if not row:
            conn.close()
            return jsonify({'ok': False, 'error': f'Match {match_id} not found in DB'}), 404

        conn.execute(
            '''
            UPDATE matches
            SET event_title = ?,
                event_week = ?,
                event_team_a = ?,
                event_team_b = ?,
                event_game = ?,
                event_team_a_ingame_side = ?
            WHERE match_id = ?
            ''',
            (series_title, week, team_a, team_b, game_label, team_a_side, match_id),
        )

        with _matches_json_lock:
            data = _load_matches_json(matches_path)
            updated = _apply_match_edit(
                data,
                match_id=match_id,
                series_title=series_title,
                week=week,
                team_a=team_a,
                team_b=team_b,
                game_label=game_label,
                team_a_side=team_a_side,
                vod_link=vod_link,
            )
            _write_matches_json(matches_path, data)

        conn.commit()
        conn.close()
        return jsonify({'ok': True, 'updated': updated})
    except ValueError as e:
        if conn is not None:
            conn.rollback()
            conn.close()
        return jsonify({'ok': False, 'error': str(e)}), 404
    except Exception as e:
        if conn is not None:
            conn.rollback()
            conn.close()
        current_app.logger.exception('Match edit failed')
        return jsonify({'ok': False, 'error': str(e)}), 500


@admin_bp.route('/api/access')
def admin_api_access():
    user = get_current_user()
    if not user:
        return jsonify({'ok': True, 'logged_in': False, 'is_admin': False, 'user': None})

    return jsonify(
        {
            'ok': True,
            'logged_in': True,
            'is_admin': bool(is_admin(user.get('id'))),
            'user': user,
        }
    )
