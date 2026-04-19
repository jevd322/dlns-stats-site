from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

import requests
from flask import Blueprint, current_app, jsonify, render_template, request

from heroes import get_hero_name
from utils.auth import require_admin
from blueprints.db_api import get_ro_conn

# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------

match_admin_bp = Blueprint("match_admin", __name__)

# ---------------------------------------------------------------------------
# In-memory job store
# ---------------------------------------------------------------------------

_jobs: Dict[str, Dict[str, Any]] = {}
_jobs_lock = threading.Lock()


def _set_job(job_id: str, status: str, message: str = "", match_id: Optional[int] = None) -> None:
    with _jobs_lock:
        _jobs[job_id] = {"status": status, "message": message, "match_id": match_id}


def _get_job(job_id: str) -> Optional[Dict[str, Any]]:
    with _jobs_lock:
        return _jobs.get(job_id)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_db_path() -> Path:
    return Path(current_app.config.get("DB_PATH", "./data/dlns.sqlite3")).resolve()


def _get_matches_json_path() -> Path:
    root = Path(current_app.root_path).parent
    p = root / "matches.json"
    if not p.exists():
        p = Path("matches.json").resolve()
    return p


def _fetch_match_metadata(match_id: int) -> Dict[str, Any]:
    """Synchronous fetch of Deadlock API match metadata. Returns match_info dict."""
    from main import fetch_match_metadata as _fetch  # noqa: import inside function to avoid circular issues
    return _fetch(match_id)


def _build_preview(match_info: Dict[str, Any]) -> Dict[str, Any]:
    """Extract per-player preview data grouped by in-game team (0=Amber, 1=Sapphire)."""
    from main import team_from_slot, extract_int  # noqa

    winning_team = extract_int(match_info.get("winning_team"))
    duration_s = extract_int(match_info.get("duration_s"))
    start_time = match_info.get("start_time") or match_info.get("started_at") or match_info.get("start")

    raw_players = match_info.get("players") or []

    # Resolve persona_names from DB for any known accounts
    account_ids = [
        extract_int(p.get("account_id"))
        for p in raw_players
        if p.get("account_id")
    ]
    account_ids = [a for a in account_ids if a is not None]

    name_map: Dict[int, str] = {}
    if account_ids:
        try:
            with get_ro_conn() as conn:
                placeholders = ",".join("?" * len(account_ids))
                rows = conn.execute(
                    f"SELECT account_id, persona_name FROM users WHERE account_id IN ({placeholders})",
                    tuple(account_ids),
                ).fetchall()
                name_map = {r[0]: r[1] for r in rows}
        except Exception:
            pass

    amber_players = []
    sapphire_players = []

    for p in raw_players:
        account_id = extract_int(p.get("account_id"))
        player_slot = extract_int(p.get("player_slot"))
        team = team_from_slot(player_slot)
        hero_id = extract_int(p.get("hero_id"))
        entry = {
            "account_id": account_id,
            "player_slot": player_slot,
            "team": team,
            "hero_id": hero_id,
            "hero_name": get_hero_name(hero_id) if hero_id else None,
            "persona_name": name_map.get(account_id) if account_id else None,
        }
        if team == 0:
            amber_players.append(entry)
        elif team == 1:
            sapphire_players.append(entry)

    return {
        "match_id": match_info.get("match_id"),
        "duration_s": duration_s,
        "start_time": start_time,
        "winning_team": winning_team,
        "amber_players": amber_players,
        "sapphire_players": sapphire_players,
    }


def _write_to_matches_json(
    path: Path,
    match_id: int,
    event_title: str,
    event_week: int,
    event_team_a: str,
    event_team_b: str,
    game_label: str,
) -> None:
    """Append the new match entry to matches.json atomically."""
    try:
        with path.open("r", encoding="utf-8-sig") as f:
            data = json.load(f)
    except Exception:
        data = {}

    # Locate or create the correct series
    series_list = data.get("series")
    if isinstance(series_list, list):
        target_series = next(
            (s for s in series_list if isinstance(s, dict) and s.get("title") == event_title),
            None,
        )
        if target_series is None:
            target_series = {"title": event_title, "weeks": []}
            series_list.append(target_series)
        weeks = target_series.setdefault("weeks", [])
    else:
        # Flat format (single-series root)
        if data.get("title") == event_title or not data.get("title"):
            weeks = data.setdefault("weeks", [])
        else:
            # Convert to multi-series
            existing = {"title": data.get("title", ""), "weeks": data.get("weeks", [])}
            target_series_new = {"title": event_title, "weeks": []}
            data = {"series": [existing, target_series_new]}
            weeks = target_series_new["weeks"]

    # Locate or create the week entry
    week_entry = next((w for w in weeks if w.get("week") == event_week), None)
    if week_entry is None:
        week_entry = {"week": event_week, "games": []}
        weeks.append(week_entry)
    games = week_entry.setdefault("games", [])

    # Locate or create the game (team pair) entry
    game_entry = next(
        (g for g in games if g.get("team_a") == event_team_a and g.get("team_b") == event_team_b),
        None,
    )
    if game_entry is None:
        game_entry = {"team_a": event_team_a, "team_b": event_team_b, "matches": []}
        games.append(game_entry)
    game_entry.setdefault("matches", []).append(
        {"game": game_label, "match_id": match_id, "team_a_side": 0}
    )

    # Atomic write
    tmp = path.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    tmp.replace(path)


# ---------------------------------------------------------------------------
# Background ingest worker
# ---------------------------------------------------------------------------

def _run_ingest(
    job_id: str,
    match_id: int,
    event_title: str,
    event_week: int,
    event_team_a: str,
    event_team_b: str,
    game_label: str,
    db_path: Path,
    matches_json_path: Path,
) -> None:
    from main import (  # noqa: deferred import to keep startup fast
        fetch_match_metadata,
        upsert_match,
        upsert_player,
        recompute_user_stats_bulk,
        extract_int,
        team_from_slot,
    )

    _set_job(job_id, "running", "Fetching match from API…", match_id)
    try:
        mi = fetch_match_metadata(match_id)
    except requests.HTTPError as e:
        status_code = e.response.status_code if getattr(e, "response", None) is not None else None
        _set_job(job_id, "error", f"API error {status_code}: {e}", match_id)
        return
    except Exception as e:
        _set_job(job_id, "error", f"Failed to fetch match: {e}", match_id)
        return

    _set_job(job_id, "running", "Writing to database…", match_id)
    try:
        conn = sqlite3.connect(str(db_path), timeout=30)
        conn.execute("PRAGMA foreign_keys=ON;")
        conn.execute("PRAGMA busy_timeout=10000;")
        conn.execute("PRAGMA journal_mode=WAL;")

        upsert_match(
            conn,
            mi,
            event_title=event_title,
            event_week=event_week,
            event_team_a=event_team_a,
            event_team_b=event_team_b,
            event_game=game_label,
            event_team_a_ingame_side=0,  # amber = team_a convention
        )

        winning_team = extract_int(mi.get("winning_team"))
        raw_players = mi.get("players") or []
        name_map: Dict[int, str] = {}
        account_ids_ingested = []

        for p in raw_players:
            account_id = extract_int(p.get("account_id"))
            if account_id:
                account_ids_ingested.append(account_id)
            upsert_player(conn, match_id, p, winning_team, name_map)

        recompute_user_stats_bulk(conn, account_ids_ingested)
        conn.commit()
        conn.close()
    except Exception as e:
        _set_job(job_id, "error", f"Database error: {e}", match_id)
        return

    _set_job(job_id, "running", "Updating matches.json…", match_id)
    try:
        _write_to_matches_json(
            matches_json_path,
            match_id,
            event_title,
            event_week,
            event_team_a,
            event_team_b,
            game_label,
        )
    except Exception as e:
        # Non-fatal — DB already written; warn but don't fail
        _set_job(job_id, "done", f"Done (matches.json update failed: {e})", match_id)
        return

    _set_job(job_id, "done", "Match ingested successfully.", match_id)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@match_admin_bp.get("/admin/matches")
@require_admin
def match_admin_page():
    return render_template("react.html", page="match_admin")


@match_admin_bp.post("/admin/match/preview")
@require_admin
def match_preview():
    body = request.get_json(silent=True) or {}
    raw_id = body.get("match_id")
    try:
        match_id = int(raw_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid match_id"}), 400

    try:
        mi = _fetch_match_metadata(match_id)
    except requests.HTTPError as e:
        status_code = e.response.status_code if getattr(e, "response", None) is not None else None
        if status_code == 404:
            return jsonify({"error": "Match not found (404)"}), 404
        return jsonify({"error": f"API error {status_code}"}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    return jsonify(_build_preview(mi))


@match_admin_bp.post("/admin/match/submit")
@require_admin
def match_submit():
    body = request.get_json(silent=True) or {}

    try:
        match_id = int(body["match_id"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "match_id is required and must be an integer"}), 400

    amber_team = str(body.get("amber_team", "")).strip()
    sapphire_team = str(body.get("sapphire_team", "")).strip()
    if not amber_team or not sapphire_team:
        return jsonify({"error": "amber_team and sapphire_team are required"}), 400

    try:
        event_week = int(body["week"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "week is required and must be an integer"}), 400

    series_title = str(body.get("series_title", "Night Shift")).strip() or "Night Shift"
    game_label = str(body.get("game_label", "Game 1")).strip() or "Game 1"

    db_path = _get_db_path()
    matches_json_path = _get_matches_json_path()

    job_id = uuid.uuid4().hex
    _set_job(job_id, "pending", "Queued", match_id)

    t = threading.Thread(
        target=_run_ingest,
        args=(
            job_id,
            match_id,
            series_title,
            event_week,
            amber_team,      # event_team_a (always amber, side=0)
            sapphire_team,   # event_team_b (always sapphire)
            game_label,
            db_path,
            matches_json_path,
        ),
        daemon=True,
    )
    t.start()

    return jsonify({"job_id": job_id})


@match_admin_bp.get("/admin/match/job/<job_id>")
@require_admin
def match_job_status(job_id: str):
    job = _get_job(job_id)
    if job is None:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job)
