from flask import Blueprint, request, redirect, url_for, session, flash, current_app, render_template
import requests
import os

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

# Discord OAuth2 configuration
DISCORD_API_BASE_URL = 'https://discord.com/api'
DISCORD_OAUTH2_URL = f'{DISCORD_API_BASE_URL}/oauth2/authorize'
DISCORD_TOKEN_URL = f'{DISCORD_API_BASE_URL}/oauth2/token'
DISCORD_USER_URL = f'{DISCORD_API_BASE_URL}/users/@me'

def get_discord_config():
    """Get Discord configuration from environment"""
    return {
        'DISCORD_CLIENT_ID': os.getenv('DISCORD_CLIENT_ID'),
        'DISCORD_CLIENT_SECRET': os.getenv('DISCORD_CLIENT_SECRET'),
        'DISCORD_REDIRECT_URI': os.getenv('DISCORD_REDIRECT_URI', 'http://localhost:5050/auth/discord/callback')
    }

@auth_bp.route('/login')
def login():
    """Redirect to Discord OAuth2 authorization with next -> state"""
    config = get_discord_config()

    next_url = request.args.get("next") or url_for("index")

    discord_auth_url = (
        f"{DISCORD_OAUTH2_URL}"
        f"?client_id={config['DISCORD_CLIENT_ID']}"
        f"&redirect_uri={config['DISCORD_REDIRECT_URI']}"
        f"&response_type=code"
        f"&scope=identify"
        f"&state={next_url}"
    )

    return redirect(discord_auth_url)


@auth_bp.route('/discord/callback')
def discord_callback():
    """Handle Discord OAuth2 callback and redirect user properly"""
    code = request.args.get('code')
    state_redirect = request.args.get('state')  # where user originally wanted to go

    if not code:
        flash('Authorization failed - no code received.', 'error')
        return redirect(url_for('index'))

    config = get_discord_config()

    token_data = {
        'client_id': config['DISCORD_CLIENT_ID'],
        'client_secret': config['DISCORD_CLIENT_SECRET'],
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': config['DISCORD_REDIRECT_URI'],
        'scope': 'identify'
    }

    headers = {'Content-Type': 'application/x-www-form-urlencoded'}

    try:
        # Exchange code for token
        token_response = requests.post(DISCORD_TOKEN_URL, data=token_data, headers=headers)
        token_response.raise_for_status()
        token_json = token_response.json()

        access_token = token_json.get('access_token')
        if not access_token:
            flash('Failed to obtain access token.', 'error')
            return redirect(url_for('index'))

        # Get Discord user
        user_headers = {'Authorization': f'Bearer {access_token}'}
        user_response = requests.get(DISCORD_USER_URL, headers=user_headers)
        user_response.raise_for_status()
        user_data = user_response.json()

        discord_id = user_data.get('id')
        username = user_data.get('username')
        discriminator = user_data.get('discriminator')
        avatar = user_data.get('avatar')

        session['discord_user'] = {
            'id': discord_id,
            'username': username,
            'discriminator': discriminator,
            'avatar': avatar,
            'full_username': (
                f"{username}#{discriminator}"
                if discriminator and discriminator != "0"
                else username
            )
        }

        current_app.logger.info(f"User logged in: {username} ({discord_id})")
        flash(f'Welcome, {username}!', 'success')

        # If we have state, redirect user back where they came from
        if state_redirect:
            return redirect(state_redirect)

        # fallback
        return redirect(url_for('index'))

    except requests.RequestException as e:
        current_app.logger.error(f"Discord OAuth error: {e}")
        flash('Authentication failed. Please try again.', 'error')
        return redirect(url_for('index'))

@auth_bp.route('/logout')
def logout():
    """Log out the current user"""
    if 'discord_user' in session:
        username = session['discord_user'].get('username', 'User')
        session.pop('discord_user', None)
        flash(f'Goodbye, {username}!', 'info')
    else:
        flash('You were not logged in.', 'info')
    
    return redirect(url_for('index'))

@auth_bp.route('/profile')
def profile():
    """Show user profile"""
    if 'discord_user' not in session:
        flash('Please log in to view your profile.', 'warning')
        return redirect(url_for('auth.login'))
    
    user = session['discord_user']
    
    return render_template('profile.html', user=user)