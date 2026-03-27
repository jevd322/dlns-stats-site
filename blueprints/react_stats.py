from flask import Blueprint, render_template

react_stats_bp = Blueprint('react_stats', __name__)


@react_stats_bp.get('/matchlist')
def matchlist():
    """Serve the React match list page."""
    return render_template('react.html', page='matchlist')


@react_stats_bp.get('/match/<int:match_id>')
def match_detail(match_id):
    """Serve the React match detail page."""
    return render_template('react.html', page='match_detail')


@react_stats_bp.get('/players')
def players_list():
    """Serve the React players list page."""
    return render_template('react.html', page='players')


@react_stats_bp.get('/player/<int:account_id>')
def player_detail(account_id):
    """Serve the React player detail page."""
    return render_template('react.html', page='player_detail')


@react_stats_bp.get('/heroes')
def heroes_list():
    """Serve the React heroes list page."""
    return render_template('react.html', page='heroes')


@react_stats_bp.get('/hero/<int:hero_id>')
def hero_detail(hero_id):
    """Serve the React hero detail page."""
    return render_template('react.html', page='hero_detail')


@react_stats_bp.get('/items')
def items_page():
    """Serve the React items page."""
    return render_template('react.html', page='items')
