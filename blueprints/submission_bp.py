import os
import json
import subprocess
from flask import (
    Blueprint, render_template, request, redirect,
    url_for, session, flash, current_app, jsonify
)
from datetime import datetime
from pathlib import Path

submission_bp = Blueprint('submission', __name__, template_folder='templates')

DATA_PATH = os.path.join("data", "guesstherank.json")


def load_data():
    if not os.path.exists(DATA_PATH):
        return {}
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}


def save_data(data):
    os.makedirs("data", exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)


def require_login(next_url):
    flash("Please login with Discord first.", "error")
    return redirect(url_for("auth.login", next=next_url))


@submission_bp.route("/gtr/submission", methods=["GET", "POST"])
def submission_form():
    user = session.get("discord_user")

    # Not logged in? redirect & remember where user wanted to go
    if not user:
        return require_login(request.path)

    discord_id = str(user["id"])
    data = load_data()

    existing = data.get(discord_id, {})

    if request.method == "POST":
        played_hero = request.form.get("played_hero", "").strip()
        times_played = request.form.get("times_played", "").strip()
        rank = request.form.get("rank", "").strip()
        match_id = request.form.get("match_id", "").strip()
        match_date = request.form.get("match_date", "").strip()
        timestamps = request.form.get("timestamps", "").strip()

        # Basic validation
        if not played_hero or not times_played or not rank or not match_id or not match_date:
            flash("Please fill all required fields.", "error")
            return redirect(request.url)

        data[discord_id] = {
            "discord_id": discord_id,
            "username": user.get("full_username", user.get("username")),
            "played_hero": played_hero,
            "times_played_last_two_weeks": times_played,
            "rank": rank,
            "match_id": match_id,
            "match_date": match_date,
            "timestamps": timestamps if timestamps else None,
            "last_updated": datetime.utcnow().isoformat()
        }

        save_data(data)

        flash("Submission saved successfully!", "success")
        return redirect(url_for("submission.submission_form"))

    return render_template("gtr_submission.html", existing=existing, user=user)


# ==================== MATCH SUBMISSION ====================

def get_allowed_match_submitters():
    """Get list of Discord IDs allowed to submit matches.
    
    Uses DISCORD_MATCH_SUBMITTERS env var (comma-separated IDs) with fallback to DISCORD_OWNER_ID
    """
    submitters_env = os.getenv("DISCORD_MATCH_SUBMITTERS", "")
    owner_id = os.getenv("DISCORD_OWNER_ID", "")
    
    if submitters_env.strip():
        return {id.strip() for id in submitters_env.split(",") if id.strip()}
    elif owner_id.strip():
        return {owner_id.strip()}
    return set()


@submission_bp.route("/match/submit/check-auth", methods=["GET"])
def check_match_submission_auth():
    """Check if current user is authorized to submit matches."""
    user = session.get("discord_user")
    
    if not user:
        return jsonify({"authorized": False, "user": None}), 401
    
    discord_id = str(user.get("id"))
    allowed_submitters = get_allowed_match_submitters()
    
    if discord_id not in allowed_submitters:
        return jsonify({"authorized": False, "user": None}), 403
    
    return jsonify({
        "authorized": True,
        "user": {
            "id": discord_id,
            "username": user.get("full_username", user.get("username"))
        }
    })


@submission_bp.route("/match/submit", methods=["POST"])
def match_submission_api():
    """Accept match submission and process via main.py. Returns JSON."""
    user = session.get("discord_user")
    
    if not user:
        return jsonify({"error": "Please login with Discord first."}), 401
    
    discord_id = str(user.get("id"))
    allowed_submitters = get_allowed_match_submitters()
    
    if discord_id not in allowed_submitters:
        return jsonify({"error": "You do not have permission to submit matches."}), 403
    
    try:
        # Collect form data
        title = request.form.get("title", "User Submission").strip()
        week = request.form.get("week", "").strip()
        team_a = request.form.get("team_a", "").strip()
        team_b = request.form.get("team_b", "").strip()
        game = request.form.get("game", "1").strip()
        match_id = request.form.get("match_id", "").strip()
        
        # Validation
        if not all([week, team_a, team_b, match_id]):
            return jsonify({"error": "Please fill all required fields (Week, Team A, Team B, Match ID)."}), 400
        
        try:
            week_num = int(week)
            match_id_num = int(match_id)
        except ValueError:
            return jsonify({"error": "Week and Match ID must be numbers."}), 400
        
        # Build the match JSON structure
        match_data = {
            "title": title,
            "weeks": [
                {
                    "week": week_num,
                    "games": [
                        {
                            "team_a": team_a,
                            "team_b": team_b,
                            "matches": [
                                {
                                    "game": game,
                                    "match_id": match_id_num
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        
        # Save to temporary file
        data_dir = Path("data")
        data_dir.mkdir(exist_ok=True)
        
        # Use timestamp to create unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        temp_match_file = data_dir / f"match_submission_{timestamp}.json"
        
        with open(temp_match_file, "w", encoding="utf-8") as f:
            json.dump(match_data, f, indent=2)
        
        # Call main.py to process the match
        try:
            db_path = current_app.config.get("DB_PATH", "./data/dlns.sqlite3")
            result = subprocess.run(
                ["python", "main.py", "-matchfile", str(temp_match_file), "-db", db_path],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                current_app.logger.error(
                    f"main.py processing failed: {result.stderr}"
                )
                return jsonify({
                    "error": f"Error processing match: {result.stderr[:200]}"
                }), 500
        except subprocess.TimeoutExpired:
            current_app.logger.error(f"main.py timeout for {temp_match_file}")
            return jsonify({"error": "Match processing timed out. Please try again."}), 500
        except Exception as e:
            current_app.logger.error(f"Match processing exception: {str(e)}")
            return jsonify({"error": f"Error processing match: {str(e)}"}), 500
        
        return jsonify({
            "success": True,
            "message": f"Match {match_id} submitted and processing!"
        })
    
    except Exception as e:
        current_app.logger.error(f"Match submission error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@submission_bp.route("/match/submit", methods=["GET"])
def match_submission():
    """Legacy: Redirect to React app."""
    return redirect(url_for("index"))


@submission_bp.route("/gtr/admin")
def admin_panel():
    user = session.get("discord_user")

    if not user:
        flash("Login required", "error")
        return redirect(url_for("auth_bp.login", next=request.path))

    discord_id = str(user.get("id"))

    if discord_id not in ADMIN_IDS:
        flash("You do not have permission to view this page.", "error")
        return redirect(url_for("index"))

    data = load_data()

    # Convert to list for template
    submissions = list(data.values())

    return render_template("gtr_admin.html", submissions=submissions)
