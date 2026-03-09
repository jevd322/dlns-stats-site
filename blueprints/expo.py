from __future__ import annotations

import csv
import io
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional
from pathlib import Path

import requests
from flask import Blueprint, Response, render_template, request, stream_with_context
from heroes import get_hero_name as get_local_hero_name

# Unique, isolated Blueprint for the DLNS exporter UI and API
expo_bp = Blueprint(
    "dlns_exporter",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/dlns-static",
    url_prefix="/dlns",
)


# --- API endpoints and config (copied from app module, hardcoded as requested) ---
MATCH_METADATA_URL = "https://api.deadlock-api.com/v1/matches/{match_id}/metadata"
HERO_DETAILS_URL = "https://assets.deadlock-api.com/v2/heroes/{hero_id}"
HERO_CLIENT_VERSION = os.getenv("HERO_CLIENT_VERSION", "6181").strip()
ITEM_DETAILS_URL = "https://assets.deadlock-api.com/v2/items/{item_id}"
ITEM_CLIENT_VERSION = os.getenv("ITEM_CLIENT_VERSION", HERO_CLIENT_VERSION).strip()
ITEM_REQUEST_TIMEOUT_S = int(os.getenv("ITEM_REQUEST_TIMEOUT_S", "6"))
ITEM_LOOKUP_WORKERS = max(1, min(int(os.getenv("ITEM_LOOKUP_WORKERS", "12")), 32))
STEAM_GET_SUMMARIES_URL = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/"
STEAM_API_KEY = os.getenv("STEAM_API_KEY", "")

HEADERS = [
    "Player Name",
    "Hero",
    "Total Souls",
    "Kills",
    "Deaths",
    "Assists",
    "Player Damage",
    "Obj Damage",
    "Healing",
    "",
    "Result",
    "Match Length",
]

BATCH_HEADERS = [
    "Match_ID",
    "Player Name",
    "Hero",
    "Total Souls",
    "Kills",
    "Deaths",
    "Assists",
    "Player Damage",
    "Obj Damage",
    "Healing",
    "",
    "Result",
    "Match Length",
]


# -------- Cache config --------
CACHE_DIR = Path.cwd() / "data" / "cache" / "matches"
def _ensure_cache_dir() -> None:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

def _cache_path(match_id: int) -> Path:
    return CACHE_DIR / f"{int(match_id)}.json"

def load_cached_match(match_id: int) -> Optional[Dict[str, Any]]:
    """Return cached match_info dict if present and valid, else None."""
    try:
        p = _cache_path(match_id)
        if not p.exists():
            return None
        with p.open("r", encoding="utf-8") as f:
            data = json.load(f)
        # We store match_info dict directly
        if isinstance(data, dict) and ("players" in data or "winning_team" in data):
            return data
    except Exception:
        return None
    return None

def save_cached_match(match_id: int, match_info: Dict[str, Any]) -> None:
    """Persist match_info dict to disk cache."""
    try:
        _ensure_cache_dir()
        p = _cache_path(match_id)
        with p.open("w", encoding="utf-8") as f:
            json.dump(match_info, f, ensure_ascii=False)
    except Exception:
        # Cache write failures should not break processing
        pass

def fetch_match_info_cached(match_id: int) -> Dict[str, Any]:
    """Load match_info from cache if available; otherwise fetch and cache."""
    cached = load_cached_match(match_id)
    if cached is not None:
        return cached
    info = get_match_metadata(int(match_id))
    # get_match_metadata returns the 'match_info' dict already
    save_cached_match(match_id, info)
    return info


# -------- Core helpers --------
def get_match_metadata(match_id: int) -> Dict[str, Any]:
    url = MATCH_METADATA_URL.format(match_id=match_id)
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if not isinstance(data, dict) or "match_info" not in data:
        raise ValueError("Unexpected response shape from match metadata API")
    return data["match_info"]


def _extract_hero_name(hero_data: Dict[str, Any]) -> Optional[str]:
    for key in ("name", "class_name", "hero_name", "localized_name"):
        value = hero_data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def get_hero_name(hero_id: Optional[int], cache: Dict[int, str]) -> str:
    if hero_id is None:
        return "Unknown"
    if hero_id in cache:
        return cache[hero_id]

    local_name = get_local_hero_name(hero_id)
    if local_name != f"Hero {hero_id}":
        cache[hero_id] = local_name
        return local_name

    try:
        params = {"language": "english"}
        if HERO_CLIENT_VERSION:
            params["client_version"] = HERO_CLIENT_VERSION

        resp = requests.get(HERO_DETAILS_URL.format(hero_id=hero_id), params=params, timeout=30)
        resp.raise_for_status()
        hero_data = resp.json()
        name = _extract_hero_name(hero_data) or local_name
        cache[hero_id] = name
        return name
    except Exception:
        cache[hero_id] = local_name
        return cache[hero_id]


def _extract_item_name(item_data: Dict[str, Any]) -> Optional[str]:
    for key in ("name", "class_name", "item_name", "localized_name"):
        value = item_data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _fetch_item_name_remote(item_id_int: int) -> str:
    try:
        params = {"language": "english"}
        if ITEM_CLIENT_VERSION:
            params["client_version"] = ITEM_CLIENT_VERSION
        resp = requests.get(ITEM_DETAILS_URL.format(item_id=item_id_int), params=params, timeout=ITEM_REQUEST_TIMEOUT_S)
        resp.raise_for_status()
        item_data = resp.json()
        return _extract_item_name(item_data) or f"Item {item_id_int}"
    except Exception:
        return f"Item {item_id_int}"


def _collect_unique_item_ids(players: List[Dict[str, Any]]) -> List[int]:
    unique: List[int] = []
    seen: set[int] = set()
    for p in players:
        items = p.get("items")
        if not isinstance(items, list):
            continue
        for item_event in items:
            if not isinstance(item_event, dict):
                continue
            item_id = item_event.get("item_id")
            try:
                item_id_int = int(item_id)
            except Exception:
                continue
            if item_id_int not in seen:
                seen.add(item_id_int)
                unique.append(item_id_int)
    return unique


def _prefetch_item_names(players: List[Dict[str, Any]], cache: Dict[int, str]) -> None:
    unique_ids = _collect_unique_item_ids(players)
    missing_ids = [iid for iid in unique_ids if iid not in cache]
    if not missing_ids:
        return

    max_workers = min(ITEM_LOOKUP_WORKERS, len(missing_ids))
    if max_workers <= 1:
        for iid in missing_ids:
            cache[iid] = _fetch_item_name_remote(iid)
        return

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_fetch_item_name_remote, iid): iid for iid in missing_ids}
        for future in as_completed(futures):
            iid = futures[future]
            try:
                cache[iid] = future.result()
            except Exception:
                cache[iid] = f"Item {iid}"


def get_item_name(item_id: Optional[int], cache: Dict[int, str]) -> str:
    if item_id is None:
        return "Unknown Item"

    try:
        item_id_int = int(item_id)
    except Exception:
        return f"Item {item_id}"

    if item_id_int in cache:
        return cache[item_id_int]

    cache[item_id_int] = _fetch_item_name_remote(item_id_int)
    return cache[item_id_int]


def to_steamid64(account_id: int) -> str:
    return str(int(account_id) + 76561197960265728)


def _chunk_list(items: List[str], size: int = 100) -> List[List[str]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def fetch_player_summaries(steam_api_key: str, steam_ids64: List[str]) -> Dict[str, str]:
    if not steam_ids64:
        return {}
    params = {"key": steam_api_key, "steamids": ",".join(steam_ids64)}
    resp = requests.get(STEAM_GET_SUMMARIES_URL, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json() or {}
    players = ((data.get("response") or {}).get("players") or [])
    result: Dict[str, str] = {}
    for p in players:
        steamid = p.get("steamid")
        persona = p.get("personaname") or p.get("realname")
        if steamid and persona:
            result[str(steamid)] = str(persona)
    return result


def resolve_player_names_steam(account_ids: List[int], steam_api_key: str) -> Dict[int, str]:
    unique_ids: List[int] = []
    seen: set[int] = set()
    for aid in account_ids:
        if aid is None:
            continue
        try:
            val = int(aid)
        except Exception:
            continue
        if val not in seen:
            seen.add(val)
            unique_ids.append(val)

    steam_ids64 = [to_steamid64(a) for a in unique_ids]
    name_by_steamid: Dict[str, str] = {}
    for chunk in _chunk_list(steam_ids64, 100):
        name_by_steamid.update(fetch_player_summaries(steam_api_key, chunk))

    result: Dict[int, str] = {}
    for aid in unique_ids:
        sid64 = to_steamid64(aid)
        result[aid] = name_by_steamid.get(sid64, "Unknown")
    return result


def team_from_slot(player_slot: Optional[int]) -> Optional[int]:
    if player_slot is None:
        return None
    try:
        if 1 <= int(player_slot) <= 6:
            return 0
        if 7 <= int(player_slot) <= 12:
            return 1
    except Exception:
        pass
    return None


def last_stats(stats: Optional[List[Dict[str, Any]]]) -> Dict[str, Any]:
    if not stats:
        return {}
    return stats[-1] if isinstance(stats, list) else {}


def format_duration(seconds: Optional[int]) -> str:
    if seconds is None:
        return "Unknown"
    try:
        s = int(seconds)
    except Exception:
        return "Unknown"
    if s < 0:
        return "Unknown"
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    if h > 0:
        return f"{h}:{m:02d}:{sec:02d}"
    return f"{m}:{sec:02d}"


def format_game_time(seconds: Optional[int]) -> str:
    if seconds is None:
        return "Unknown"
    try:
        s = int(seconds)
    except Exception:
        return "Unknown"

    sign = "-" if s < 0 else ""
    s_abs = abs(s)
    m, sec = divmod(s_abs, 60)
    return f"{sign}{m}:{sec:02d}"


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _team_label(team: Optional[int]) -> str:
    if team == 0:
        return "Amber"
    if team == 1:
        return "Sapphire"
    return "Unknown"


def _build_item_timeline(items: Any, item_name_cache: Dict[int, str]) -> List[Dict[str, Any]]:
    if not isinstance(items, list):
        return []

    events: List[Dict[str, Any]] = []
    for item_event in items:
        if not isinstance(item_event, dict):
            continue

        item_name = get_item_name(item_event.get("item_id"), item_name_cache)
        bought_at = item_event.get("game_time_s")
        sold_at = item_event.get("sold_time_s")

        if bought_at is not None:
            buy_s = _to_int(bought_at, default=0)
            events.append({
                "type": "BUY",
                "time_s": buy_s,
                "time": format_game_time(buy_s),
                "item": item_name,
            })

        if sold_at is not None:
            sold_s = _to_int(sold_at, default=-1)
            if sold_s >= 0:
                events.append({
                    "type": "SELL",
                    "time_s": sold_s,
                    "time": format_game_time(sold_s),
                    "item": item_name,
                })

    events.sort(key=lambda e: (e.get("time_s", 0), e.get("type", "")))
    return events


def build_hero_breakdown(match_info: Dict[str, Any], name_map: Dict[int, str], match_id: Optional[str] = None) -> List[Dict[str, Any]]:
    players = match_info.get("players", []) or []
    winning_team = match_info.get("winning_team")
    breakdown: List[Dict[str, Any]] = []
    hero_cache: Dict[int, str] = {}
    item_name_cache: Dict[int, str] = {}
    _prefetch_item_names(players, item_name_cache)

    for p in players:
        stats_final = last_stats(p.get("stats"))
        team = team_from_slot(p.get("player_slot"))
        account_id = p.get("account_id")
        hero_id = p.get("hero_id")
        hero_name = get_hero_name(hero_id, hero_cache)
        player_name = name_map.get(account_id, "Unknown")

        kills = _to_int(stats_final.get("kills") if stats_final else p.get("kills"))
        deaths = _to_int(stats_final.get("deaths") if stats_final else p.get("deaths"))
        assists = _to_int(stats_final.get("assists") if stats_final else p.get("assists"))
        shots_hit = _to_int(stats_final.get("shots_hit"))
        shots_missed = _to_int(stats_final.get("shots_missed"))
        shots_total = shots_hit + shots_missed
        shot_accuracy_pct: Optional[float] = None
        if shots_total > 0:
            shot_accuracy_pct = (shots_hit * 100.0) / shots_total

        if team is None or winning_team is None:
            result = "Unknown"
        else:
            result = "Win" if int(team) == int(winning_team) else "Loss"

        item_events = _build_item_timeline(p.get("items"), item_name_cache)

        detail: Dict[str, Any] = {
            "Player Name": player_name,
            "Hero": hero_name,
            "Team": _team_label(team),
            "Result": result,
            "Kills": kills,
            "Deaths": deaths,
            "Assists": assists,
            "KDA": f"{kills}/{deaths}/{assists}",
            "Creep Kills": _to_int(stats_final.get("creep_kills")),
            "Neutral Kills": _to_int(stats_final.get("neutral_kills")),
            "Last Hits": _to_int(p.get("last_hits"), default=_to_int(stats_final.get("creep_kills"))),
            "Denies": _to_int(stats_final.get("denies")),
            "Shots Hit": shots_hit,
            "Shots Missed": shots_missed,
            "Shot Accuracy %": round(shot_accuracy_pct, 1) if shot_accuracy_pct is not None else None,
            "Player Damage": _to_int(stats_final.get("player_damage")),
            "Obj Damage": _to_int(stats_final.get("boss_damage")),
            "Healing": _to_int(stats_final.get("player_healing")),
            "Self Healing": _to_int(stats_final.get("self_healing")),
            "Teammate Healing": _to_int(stats_final.get("teammate_healing")),
            "Damage Taken": _to_int(stats_final.get("player_damage_taken")),
            "Damage Mitigated": _to_int(stats_final.get("damage_mitigated")),
            "Headshot Kills": _to_int(stats_final.get("headshot_kills")),
            "Bullet Kills": _to_int(stats_final.get("bullet_kills")),
            "Melee Kills": _to_int(stats_final.get("melee_kills")),
            "Ability Kills": _to_int(stats_final.get("ability_kills")),
            "Level": _to_int(stats_final.get("level")),
            "Max Health": _to_int(stats_final.get("max_health")),
            "Item Events": item_events,
            "Item Timeline": " | ".join([f"{ev['time']} {ev['type']} {ev['item']}" for ev in item_events]),
        }

        if match_id is not None:
            detail["Match_ID"] = match_id

        breakdown.append(detail)

    # Keep consistent ordering: winners first, then losers, then unknown.
    winners = [r for r in breakdown if r.get("Result") == "Win"]
    losers = [r for r in breakdown if r.get("Result") == "Loss"]
    unknowns = [r for r in breakdown if r.get("Result") not in ("Win", "Loss")]
    return winners + losers + unknowns


def build_rows(match_info: Dict[str, Any], name_map: Dict[int, str], match_id: Optional[str] = None) -> List[Dict[str, Any]]:
    players = match_info.get("players", []) or []
    winning_team = match_info.get("winning_team")
    duration_s = match_info.get("duration_s")
    rows: List[Dict[str, Any]] = []
    hero_cache: Dict[int, str] = {}

    for p in players:
        pslot = p.get("player_slot")
        team = team_from_slot(pslot)
        stats_final = last_stats(p.get("stats"))

        account_id = p.get("account_id")
        hero_id = p.get("hero_id")
        hero_name = get_hero_name(hero_id, hero_cache)
        player_name = name_map.get(account_id, "Unknown")

        net_worth = stats_final.get("net_worth")
        kills = stats_final.get("kills")
        deaths = stats_final.get("deaths")
        assists = stats_final.get("assists")
        player_damage = stats_final.get("player_damage")
        obj_damage = stats_final.get("boss_damage")  # proxy for objective damage
        healing = stats_final.get("player_healing")
        
        
        if team is None or winning_team is None:
            result = "Unknown"
        else:
            result = "Win" if int(team) == int(winning_team) else "Loss"

        row_data = {
            "Player Name": player_name,
            "Hero": hero_name,
            "Total Souls": net_worth,
            "Kills": kills,
            "Deaths": deaths,
            "Assists": assists,
            "Player Damage": player_damage,
            "Obj Damage": obj_damage,
            "Healing": healing,
            "Result": result,
            "Match Length": format_duration(duration_s),
        }
        
        # Add Match_ID if provided (for batch processing)
        if match_id is not None:
            row_data["Match_ID"] = match_id
            
        rows.append(row_data)

    winners = [r for r in rows if r.get("Result") == "Win"]
    losers = [r for r in rows if r.get("Result") == "Loss"]
    unknowns = [r for r in rows if r.get("Result") not in ("Win", "Loss")]
    return winners + losers + unknowns


def rows_to_delimited(rows: List[Dict[str, Any]], sep: str = ",", include_header: bool = True, use_batch_headers: bool = False) -> str:
    output = io.StringIO()
    writer = csv.writer(output, delimiter=sep)
    headers = BATCH_HEADERS if use_batch_headers else HEADERS
    
    if include_header:
        writer.writerow(headers)
    for r in rows or []:
        writer.writerow([r.get(h, "") for h in headers])
    return output.getvalue()


def rows_to_tsv_no_match_id(rows: List[Dict[str, Any]], include_header: bool = False) -> str:
    """Generate TSV without Match_ID column for batch results"""
    output = io.StringIO()
    writer = csv.writer(output, delimiter="\t")
    
    if include_header:
        writer.writerow(HEADERS)
    for r in rows or []:
        writer.writerow([r.get(h, "") for h in HEADERS])
    return output.getvalue()


# --- Routes ---
@expo_bp.get("/")
def index():  # type: ignore
    return render_template("dlns_exporter/index.html")


@expo_bp.get("/results")
def results():  # type: ignore
    # Results page reads data from sessionStorage via JS
    return render_template("dlns_exporter/results.html")


@expo_bp.post("/process")
def process_match():  # type: ignore
    payload = request.get_json(silent=True) or {}
    include_detailed = bool(payload.get("include_detailed", False))

    def generate():
        try:
            if not STEAM_API_KEY:
                yield json.dumps({"type": "error", "message": "Error: STEAM_API_KEY missing. Set it in .env."}) + "\n"
                return

            match_input = str(payload.get("match_id", "")).strip()
            if not match_input:
                yield json.dumps({"type": "error", "message": "Error: Match ID(s) required."}) + "\n"
                return

            # Check if batch processing (comma detected)
            if "," in match_input:
                yield json.dumps({"type": "batch_start", "message": "Batch processing detected...", "percent": 0}) + "\n"
                match_ids = [mid.strip() for mid in match_input.split(",") if mid.strip()]
                invalid_ids = [mid for mid in match_ids if not mid.isdigit()]
                if invalid_ids:
                    yield json.dumps({"type": "error", "message": f"Error: Invalid match IDs: {', '.join(invalid_ids)}"}) + "\n"
                    return

                total_matches = len(match_ids)
                steps_per_match = 4
                total_steps = max(total_matches * steps_per_match, 1)
                yield json.dumps({"type": "log", "message": f"Processing {total_matches} matches...", "percent": 0}) + "\n"
                all_rows = []

                for i, match_id in enumerate(match_ids):
                    try:
                        base_step = i * steps_per_match
                        overall_percent = int((base_step / total_steps) * 100)
                        yield json.dumps({"type": "progress", "message": f"Processing match {i+1}/{total_matches}: {match_id}...", "percent": overall_percent}) + "\n"

                        # Fetch with cache
                        info = fetch_match_info_cached(int(match_id))
                        # Log unified fetch message
                        overall_percent = int(((base_step + 1) / total_steps) * 100)
                        yield json.dumps({"type": "progress", "message": "Fetched Cache Match", "percent": overall_percent}) + "\n"

                        players = info.get("players", []) or []
                        overall_percent = int(((base_step + 2) / total_steps) * 100)
                        yield json.dumps({"type": "progress", "message": f"Match {match_id}: Found {len(players)} players. Resolving names...", "percent": overall_percent}) + "\n"

                        # Always resolve names from JSON players (fresh)
                        account_ids_all = [p.get("account_id") for p in players if p.get("account_id") is not None]
                        name_map = resolve_player_names_steam(account_ids_all, STEAM_API_KEY)

                        overall_percent = int(((base_step + 3) / total_steps) * 100)
                        yield json.dumps({"type": "progress", "message": f"Match {match_id}: Parsing final stats...", "percent": overall_percent}) + "\n"
                        rows = build_rows(info, name_map, match_id)
                        all_rows.extend(rows)

                        overall_percent = int(((base_step + 4) / total_steps) * 100)
                        yield json.dumps({"type": "progress", "message": f"Match {match_id}: Complete ({len(rows)} players)", "percent": overall_percent}) + "\n"

                    except requests.HTTPError as e:
                        yield json.dumps({"type": "progress", "message": f"Match {match_id}: HTTP error - {e}"}) + "\n"
                    except Exception as e:
                        yield json.dumps({"type": "progress", "message": f"Match {match_id}: Error - {e}"}) + "\n"

                yield json.dumps({"type": "log", "message": "Preparing combined CSV export...", "percent": 98}) + "\n"
                csv_text = rows_to_delimited(all_rows, ",", include_header=True, use_batch_headers=True)
                tsv_text = rows_to_delimited(all_rows, "\t", include_header=False, use_batch_headers=True)
                tsv_no_match_id = rows_to_tsv_no_match_id(all_rows, include_header=False)

                result = {
                    "type": "batch_result",
                    "headers": BATCH_HEADERS,
                    "rows": all_rows,
                    "csv": csv_text,
                    "tsv": tsv_text,
                    "tsv_no_match_id": tsv_no_match_id,
                    "hero_details": [],
                    "total_matches": len(match_ids),
                    "total_players": len(all_rows),
                }
                yield json.dumps(result) + "\n"
                yield json.dumps({"type": "progress", "message": "Batch export ready.", "percent": 100}) + "\n"

            else:
                # Single match processing
                if not match_input.isdigit():
                    yield json.dumps({"type": "error", "message": "Error: Match ID must be an integer."}) + "\n"
                    return

                total_steps = 4
                yield json.dumps({"type": "progress", "message": "Starting match processing...", "percent": 0}) + "\n"
                # Fetch with cache
                info = fetch_match_info_cached(int(match_input))
                yield json.dumps({"type": "log", "message": "Fetched Cache Match", "percent": int((1 / total_steps) * 100)}) + "\n"

                players = info.get("players", []) or []
                yield json.dumps({"type": "log", "message": f"Found {len(players)} players. Resolving names via Steam...", "percent": int((2 / total_steps) * 100)}) + "\n"

                # Resolve names from JSON players (fresh each time)
                account_ids_all = [p.get("account_id") for p in players if p.get("account_id") is not None]
                name_map = resolve_player_names_steam(account_ids_all, STEAM_API_KEY)

                yield json.dumps({"type": "log", "message": "Parsing final stats...", "percent": int((3 / total_steps) * 100)}) + "\n"
                rows = build_rows(info, name_map)
                if include_detailed:
                    yield json.dumps({"type": "log", "message": "Detailed mode: building hero/item breakdown...", "percent": 85}) + "\n"
                hero_details = build_hero_breakdown(info, name_map, match_input) if include_detailed else []

                yield json.dumps({"type": "log", "message": "Preparing exports...", "percent": int((4 / total_steps) * 100)}) + "\n"
                csv_text = rows_to_delimited(rows, ",", include_header=True)
                tsv_text = rows_to_delimited(rows, "\t", include_header=False)

                result = {
                    "type": "result",
                    "headers": HEADERS,
                    "rows": rows,
                    "hero_details": hero_details,
                    "csv": csv_text,
                    "tsv": tsv_text,
                    "match_id": match_input,
                }
                yield json.dumps(result) + "\n"
                yield json.dumps({"type": "progress", "message": "Match export ready.", "percent": 100}) + "\n"

        except requests.HTTPError as e:
            yield json.dumps({"type": "error", "message": f"HTTP error: {e}"}) + "\n"
        except Exception as e:
            yield json.dumps({"type": "error", "message": f"Error: {e}"}) + "\n"

    response = Response(stream_with_context(generate()), mimetype="application/x-ndjson")
    # Hint reverse proxies (notably Nginx) to stream chunks immediately.
    response.headers["X-Accel-Buffering"] = "no"
    response.headers["Cache-Control"] = "no-cache"
    return response
