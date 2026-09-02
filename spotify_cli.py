"""
spotify_cli.py
Controls Spotify playback from the terminal using the official Web API
(https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback
and the other /me/player/* endpoints) instead of NovaBoard's "open a tab to
wake a device" fallback.

IMPORTANT: the Web API only ever remote-controls a device that is already
active (the Spotify desktop app, mobile app, a Connect speaker, etc.) -- it
cannot make audio come out of your speakers on its own. If no device is
active anywhere, `play`/`pause`/etc. will fail with a clear "no active
device" message instead of silently opening a browser tab.

Setup (one-time):
  1. pip install requests
  2. https://developer.spotify.com/dashboard -> your app -> Settings ->
     add this exact Redirect URI:  http://127.0.0.1:8888/callback
  3. python spotify_cli.py login --client-id YOUR_CLIENT_ID
     (this opens your browser once for the Spotify consent screen, then
     never again -- the token is cached in .spotify_token_cache.json)

Usage:
  python spotify_cli.py status
  python spotify_cli.py devices
  python spotify_cli.py play [--uri spotify:track:... | --context spotify:playlist:...] [--device-id ID]
  python spotify_cli.py pause
  python spotify_cli.py next
  python spotify_cli.py prev
  python spotify_cli.py volume 70
  python spotify_cli.py transfer DEVICE_ID
"""

import argparse
import base64
import hashlib
import json
import os
import secrets
import sys
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlencode, urlparse, parse_qs

import requests

TOKEN_CACHE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".spotify_token_cache.json")
REDIRECT_URI = "http://127.0.0.1:8888/callback"
REDIRECT_PORT = 8888
SCOPES = "user-read-playback-state user-modify-playback-state user-read-currently-playing"
AUTHORIZE_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
API_BASE = "https://api.spotify.com/v1"


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _generate_pkce_pair():
    verifier = _b64url(secrets.token_bytes(40))
    challenge = _b64url(hashlib.sha256(verifier.encode("ascii")).digest())
    return verifier, challenge


class _CallbackHandler(BaseHTTPRequestHandler):
    """Captures the ?code=... (or ?error=...) query param from the OAuth redirect."""

    result = {}

    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        _CallbackHandler.result["code"] = query.get("code", [None])[0]
        _CallbackHandler.result["error"] = query.get("error", [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        message = "You can close this tab and return to the terminal." if _CallbackHandler.result["code"] \
            else f"Authorization failed: {_CallbackHandler.result['error']}"
        self.wfile.write(f"<html><body><p>{message}</p></body></html>".encode("utf-8"))

    def log_message(self, *args):
        pass  # silence default request logging


class NoActiveDeviceError(Exception):
    pass


class SpotifyClient:
    def __init__(self):
        self._cache = self._load_cache()

    # ── Token cache ──────────────────────────────────────────────────────
    def _load_cache(self):
        if os.path.exists(TOKEN_CACHE_PATH):
            with open(TOKEN_CACHE_PATH, "r") as f:
                return json.load(f)
        return {}

    def _save_cache(self):
        with open(TOKEN_CACHE_PATH, "w") as f:
            json.dump(self._cache, f, indent=2)

    # ── Auth ─────────────────────────────────────────────────────────────
    def login(self, client_id: str):
        verifier, challenge = _generate_pkce_pair()
        state = secrets.token_urlsafe(16)

        params = {
            "client_id": client_id,
            "response_type": "code",
            "redirect_uri": REDIRECT_URI,
            "scope": SCOPES,
            "code_challenge_method": "S256",
            "code_challenge": challenge,
            "state": state,
        }
        auth_url = f"{AUTHORIZE_URL}?{urlencode(params)}"

        _CallbackHandler.result = {}
        server = HTTPServer(("127.0.0.1", REDIRECT_PORT), _CallbackHandler)

        print("Opening your browser to log in to Spotify (one-time only)...")
        webbrowser.open(auth_url)
        server.handle_request()  # blocks until the single redirect arrives
        server.server_close()

        code = _CallbackHandler.result.get("code")
        error = _CallbackHandler.result.get("error")
        if error or not code:
            raise RuntimeError(f"Spotify authorization failed: {error or 'no code received'}")

        token_data = self._exchange_code(client_id, code, verifier)
        self._cache = {
            "client_id": client_id,
            "access_token": token_data["access_token"],
            "refresh_token": token_data["refresh_token"],
            "expires_at": time.time() + token_data["expires_in"],
        }
        self._save_cache()
        print("Logged in. Token cached in", TOKEN_CACHE_PATH)

    def _exchange_code(self, client_id, code, verifier):
        res = requests.post(TOKEN_URL, data={
            "client_id": client_id,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "code_verifier": verifier,
        })
        res.raise_for_status()
        return res.json()

    def _refresh(self):
        client_id = self._cache.get("client_id")
        refresh_token = self._cache.get("refresh_token")
        if not client_id or not refresh_token:
            raise RuntimeError("Not logged in. Run: python spotify_cli.py login --client-id YOUR_CLIENT_ID")

        res = requests.post(TOKEN_URL, data={
            "client_id": client_id,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        })
        res.raise_for_status()
        data = res.json()
        self._cache["access_token"] = data["access_token"]
        self._cache["expires_at"] = time.time() + data["expires_in"]
        if "refresh_token" in data:
            self._cache["refresh_token"] = data["refresh_token"]
        self._save_cache()

    def _get_token(self):
        if not self._cache.get("access_token"):
            raise RuntimeError("Not logged in. Run: python spotify_cli.py login --client-id YOUR_CLIENT_ID")
        if time.time() >= self._cache.get("expires_at", 0) - 30:
            self._refresh()
        return self._cache["access_token"]

    # ── Generic request ─────────────────────────────────────────────────
    def _request(self, method, endpoint, params=None, json_body=None):
        token = self._get_token()
        res = requests.request(
            method,
            f"{API_BASE}{endpoint}",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
            json=json_body,
        )
        if res.status_code == 404:
            raise NoActiveDeviceError(
                "No active Spotify device found. Open Spotify (desktop app, mobile app, "
                "or any Connect speaker) somewhere and try again -- this tool can only "
                "control a device that already exists, it can't create one."
            )
        if res.status_code == 403:
            raise RuntimeError("Forbidden -- this often means the Spotify account isn't Premium "
                                "(playback control requires Premium).")
        res.raise_for_status()
        if res.status_code == 204 or not res.content:
            return None
        return res.json()

    # ── Player endpoints ─────────────────────────────────────────────────
    def get_devices(self):
        return self._request("GET", "/me/player/devices")

    def get_playback_state(self):
        return self._request("GET", "/me/player")

    def play(self, uris=None, context_uri=None, device_id=None):
        params = {"device_id": device_id} if device_id else None
        body = {}
        if uris:
            body["uris"] = uris
        if context_uri:
            body["context_uri"] = context_uri
        self._request("PUT", "/me/player/play", params=params, json_body=body or None)

    def pause(self, device_id=None):
        params = {"device_id": device_id} if device_id else None
        self._request("PUT", "/me/player/pause", params=params)

    def next_track(self, device_id=None):
        params = {"device_id": device_id} if device_id else None
        self._request("POST", "/me/player/next", params=params)

    def previous_track(self, device_id=None):
        params = {"device_id": device_id} if device_id else None
        self._request("POST", "/me/player/previous", params=params)

    def set_volume(self, percent, device_id=None):
        params = {"volume_percent": percent}
        if device_id:
            params["device_id"] = device_id
        self._request("PUT", "/me/player/volume", params=params)

    def transfer_playback(self, device_id, play=True):
        self._request("PUT", "/me/player", json_body={"device_ids": [device_id], "play": play})


# ── CLI ──────────────────────────────────────────────────────────────────

def _print_status(client: SpotifyClient):
    state = client.get_playback_state()
    if not state or not state.get("item"):
        print("Nothing is currently playing.")
        return
    item = state["item"]
    artists = ", ".join(a["name"] for a in item.get("artists", []))
    progress_s = (state.get("progress_ms") or 0) // 1000
    duration_s = (item.get("duration_ms") or 0) // 1000
    device = state.get("device", {})
    print(f'{"Playing" if state.get("is_playing") else "Paused"}: {item["name"]} - {artists}')
    print(f"  {progress_s // 60}:{progress_s % 60:02d} / {duration_s // 60}:{duration_s % 60:02d}")
    print(f"  Device: {device.get('name')} ({device.get('type')}) volume={device.get('volume_percent')}%")


def _print_devices(client: SpotifyClient):
    data = client.get_devices()
    devices = data.get("devices", []) if data else []
    if not devices:
        print("No devices found. Open Spotify somewhere (desktop, mobile, or a Connect speaker).")
        return
    for d in devices:
        active = " (active)" if d.get("is_active") else ""
        print(f"  {d['id']}  {d['name']} [{d['type']}]{active}")


def main():
    parser = argparse.ArgumentParser(description="Control Spotify playback without opening a browser tab.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_login = sub.add_parser("login", help="One-time OAuth login")
    p_login.add_argument("--client-id", required=True)

    sub.add_parser("status", help="Show what's currently playing")
    sub.add_parser("devices", help="List available Spotify Connect devices")

    p_play = sub.add_parser("play", help="Resume or start playback")
    p_play.add_argument("--uri", action="append", dest="uris", help="Track URI (repeatable)")
    p_play.add_argument("--context", dest="context_uri", help="Album/artist/playlist URI")
    p_play.add_argument("--device-id", dest="device_id")

    p_pause = sub.add_parser("pause", help="Pause playback")
    p_pause.add_argument("--device-id", dest="device_id")

    p_next = sub.add_parser("next", help="Skip to next track")
    p_next.add_argument("--device-id", dest="device_id")

    p_prev = sub.add_parser("prev", help="Skip to previous track")
    p_prev.add_argument("--device-id", dest="device_id")

    p_vol = sub.add_parser("volume", help="Set volume 0-100")
    p_vol.add_argument("percent", type=int)
    p_vol.add_argument("--device-id", dest="device_id")

    p_transfer = sub.add_parser("transfer", help="Move playback to a device")
    p_transfer.add_argument("device_id")
    p_transfer.add_argument("--no-play", action="store_true", help="Transfer without starting playback")

    args = parser.parse_args()
    client = SpotifyClient()

    try:
        if args.command == "login":
            client.login(args.client_id)
        elif args.command == "status":
            _print_status(client)
        elif args.command == "devices":
            _print_devices(client)
        elif args.command == "play":
            client.play(uris=args.uris, context_uri=args.context_uri, device_id=args.device_id)
            print("Playing.")
        elif args.command == "pause":
            client.pause(device_id=args.device_id)
            print("Paused.")
        elif args.command == "next":
            client.next_track(device_id=args.device_id)
            print("Skipped to next track.")
        elif args.command == "prev":
            client.previous_track(device_id=args.device_id)
            print("Skipped to previous track.")
        elif args.command == "volume":
            client.set_volume(args.percent, device_id=args.device_id)
            print(f"Volume set to {args.percent}%.")
        elif args.command == "transfer":
            client.transfer_playback(args.device_id, play=not args.no_play)
            print("Playback transferred.")
    except NoActiveDeviceError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except requests.HTTPError as e:
        print(f"Spotify API error: {e.response.status_code} {e.response.text}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
