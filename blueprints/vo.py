from __future__ import annotations

import csv
import io
import json
import os
import time
from pathlib import Path

import requests
from flask import Blueprint, abort, jsonify, render_template, request

from utils.auth import get_current_user

vo_bp = Blueprint(
    "vo",
    __name__,
    url_prefix="/vo",
)

DATA_DIR = Path("data")
VO_CONTENT_FILE = DATA_DIR / "vo_content.json"
ADMIN_IDS = {
    "281950593436614656",
    "285203317162770442",
    "950380630905069578",
}


def _is_admin(user: dict | None) -> bool:
    if not user:
        return False
    return str(user.get("id")) in ADMIN_IDS


def _default_content() -> dict:
    return {
        "html": "",
        "assets": {"zip": None, "videos": [], "artwork": []},
        "updated_at": None,
        "updated_by": None,
    }


def _load_vo_content() -> dict:
    try:
        if VO_CONTENT_FILE.exists():
            data = json.loads(VO_CONTENT_FILE.read_text(encoding="utf-8"))
            # Ensure required keys exist for the frontend
            base = _default_content()
            base.update({k: v for k, v in data.items() if k in base or k == "assets"})
            if not isinstance(base.get("assets"), dict):
                base["assets"] = {"zip": None, "videos": [], "artwork": []}
            else:
                base["assets"].setdefault("zip", None)
                base["assets"].setdefault("videos", [])
                base["assets"].setdefault("artwork", [])
            return base
    except Exception:
        pass
    return _default_content()


def _save_vo_content(html: str, assets: dict | None, user: dict) -> dict:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    safe_assets = assets if isinstance(assets, dict) else {}
    safe_assets.setdefault("zip", None)
    safe_assets.setdefault("videos", [])
    safe_assets.setdefault("artwork", [])

    payload = {
        "html": html or "",
        "assets": safe_assets,
        "updated_at": int(time.time()),
        "updated_by": user.get("username") or user.get("global_name") or user.get("name") or str(user.get("id")),
    }
    VO_CONTENT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


@vo_bp.get("/api/tasks")
def api_vo_tasks():
    """Proxy VO spreadsheet as JSON to avoid exposing the CSV URL to clients."""
    sheet_url = os.getenv("VO_SHEET_CSV_URL")
    if not sheet_url:
        return jsonify({"ok": False, "error": "Sheet URL not configured"}), 500

    try:
        resp = requests.get(sheet_url, timeout=10)
        if resp.status_code != 200:
            return jsonify({"ok": False, "error": f"Sheet fetch failed ({resp.status_code})"}), 502
    except Exception as exc:  # noqa: BLE001
        return jsonify({"ok": False, "error": f"Sheet fetch error: {exc}"}), 502

    reader = csv.DictReader(io.StringIO(resp.text))
    tasks = []
    for row in reader:
        tasks.append({
            "title": row.get("Line") or row.get("Title") or row.get("Line ID") or "",
            "owner": row.get("Owner") or row.get("Assignee") or row.get("Assigned To") or "",
            "status": row.get("Status") or row.get("Status ") or row.get("State") or "Open",
            "raw": row,
        })

    return jsonify({"ok": True, "tasks": tasks})


@vo_bp.get("/api/content")
def api_vo_content_get():
    content = _load_vo_content()
    return jsonify({"ok": True, "content": content})


@vo_bp.post("/api/content")
def api_vo_content_save():
    user = get_current_user()
    if not _is_admin(user):
        abort(403)

    payload = request.get_json(silent=True) or {}
    html = payload.get("html") or ""
    assets = payload.get("assets") or {}
    saved = _save_vo_content(html, assets, user)
    return jsonify({"ok": True, "content": saved})


@vo_bp.get("")
def vo_public():
    """Public Community VO hub (React bundle)."""
    return render_template("react.html", entry="vo")


@vo_bp.get("/admin")
def vo_admin():
    """Admin-only Community VO management (React bundle)."""
    user = get_current_user()
    if not _is_admin(user):
        abort(403)
    return render_template("react.html", entry="vo_admin")
