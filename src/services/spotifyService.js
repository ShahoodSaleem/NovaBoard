const SPOTIFY_TOKEN_KEY        = 'flowmarks_spotify_token';
const SPOTIFY_TOKEN_EXPIRY_KEY = 'flowmarks_spotify_token_expiry';
const SPOTIFY_REFRESH_TOKEN_KEY = 'flowmarks_spotify_refresh_token';
const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ');

const getLocal = (keys) =>
  new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(keys, resolve);
    } else {
      const result = {};
      keys.forEach((k) => {
        try {
          result[k] = JSON.parse(localStorage.getItem(k));
        } catch {
          result[k] = null;
        }
      });
      resolve(result);
    }
  });

const setLocal = (obj) =>
  new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set(obj, resolve);
    } else {
      Object.entries(obj).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
      resolve();
    }
  });

const removeLocal = (keys) =>
  new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove(keys, resolve);
    } else {
      keys.forEach((k) => localStorage.removeItem(k));
      resolve();
    }
  });

/* ── PKCE Cryptography Helpers ── */
function dec2hex(dec) {
  return ('0' + dec.toString(16)).substr(-2);
}

function generateCodeVerifier() {
  const array = new Uint32Array(56 / 2);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec2hex).join('');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a) {
  let str = "";
  const bytes = new Uint8Array(a);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(v) {
  const hashed = await sha256(v);
  return base64urlencode(hashed);
}

class SpotifyService {
  async authenticate(clientId) {
    if (!clientId) throw new Error('No Spotify Client ID provided');

    const redirectUri =
      typeof chrome !== 'undefined' && chrome.runtime
        ? `https://${chrome.runtime.id}.chromiumapp.org/`
        : `${window.location.origin}/callback`;

    const codeVerifier = generateCodeVerifier();
    await setLocal({ 'flowmarks_spotify_code_verifier': codeVerifier });

    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const authUrl =
      `https://accounts.spotify.com/authorize` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(SPOTIFY_SCOPES)}` +
      `&code_challenge_method=S256` +
      `&code_challenge=${encodeURIComponent(codeChallenge)}` +
      `&show_dialog=true`;

    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.identity) {
        chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          this._handleAuthResponse(responseUrl, clientId, redirectUri, resolve, reject);
        });
      } else {
        window.open(authUrl, '_blank');
        reject(new Error('OAuth only works inside the Chrome extension'));
      }
    });
  }

  async _handleAuthResponse(responseUrl, clientId, redirectUri, resolve, reject) {
    if (!responseUrl) {
      reject(new Error('No response URL received from Spotify'));
      return;
    }
    try {
      const urlObj = new URL(responseUrl);
      const code = urlObj.searchParams.get('code');
      const err = urlObj.searchParams.get('error');

      if (err) {
        reject(new Error(`Spotify Authorization failed: ${err}`));
        return;
      }
      if (!code) {
        reject(new Error('Authorization code not found in response URL'));
        return;
      }

      // Retrieve stored code verifier
      const r = await getLocal(['flowmarks_spotify_code_verifier']);
      const codeVerifier = r['flowmarks_spotify_code_verifier'];
      if (!codeVerifier) {
        reject(new Error('Cryptographic code verifier was lost during authentication'));
        return;
      }

      const token = await this._exchangeCodeForTokens(code, codeVerifier, clientId, redirectUri);
      await removeLocal(['flowmarks_spotify_code_verifier']);
      resolve(token);
    } catch (e) {
      reject(e);
    }
  }

  async _exchangeCodeForTokens(code, codeVerifier, clientId, redirectUri) {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Token exchange failed: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const expiry = Date.now() + parseInt(data.expires_in || '3600', 10) * 1000;

    await setLocal({
      [SPOTIFY_TOKEN_KEY]: data.access_token,
      [SPOTIFY_TOKEN_EXPIRY_KEY]: expiry,
      [SPOTIFY_REFRESH_TOKEN_KEY]: data.refresh_token,
      'flowmarks_spotify_client_id': clientId
    });

    return data.access_token;
  }

  async _refreshAccessToken(refreshToken, clientId) {
    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (!res.ok) {
        throw new Error(`Refresh request failed with status: ${res.status}`);
      }

      const data = await res.json();
      const expiry = Date.now() + parseInt(data.expires_in || '3600', 10) * 1000;

      const storageObj = {
        [SPOTIFY_TOKEN_KEY]: data.access_token,
        [SPOTIFY_TOKEN_EXPIRY_KEY]: expiry
      };
      if (data.refresh_token) {
        storageObj[SPOTIFY_REFRESH_TOKEN_KEY] = data.refresh_token;
      }

      await setLocal(storageObj);
      return data.access_token;
    } catch (e) {
      await this.logout();
      return null;
    }
  }

  async getToken() {
    const r = await getLocal([
      SPOTIFY_TOKEN_KEY,
      SPOTIFY_TOKEN_EXPIRY_KEY,
      SPOTIFY_REFRESH_TOKEN_KEY,
      'flowmarks_spotify_client_id'
    ]);
    const token = r[SPOTIFY_TOKEN_KEY];
    const expiry = r[SPOTIFY_TOKEN_EXPIRY_KEY];
    const refreshToken = r[SPOTIFY_REFRESH_TOKEN_KEY];
    const clientId = r['flowmarks_spotify_client_id'];

    if (token && expiry && Date.now() < expiry - 30000) {
      return token;
    }

    if (refreshToken && clientId) {
      return this._refreshAccessToken(refreshToken, clientId);
    }

    return null;
  }

  async logout() {
    await removeLocal([
      SPOTIFY_TOKEN_KEY,
      SPOTIFY_TOKEN_EXPIRY_KEY,
      SPOTIFY_REFRESH_TOKEN_KEY
    ]);
  }

  async apiRequest(endpoint, method = 'GET', body = null) {
    const token = await this.getToken();
    if (!token) throw new Error('Not authenticated');
    const opts = { method, headers: { Authorization: `Bearer ${token}` } };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(`https://api.spotify.com/v1${endpoint}`, opts);
    if (res.status === 204) return null;
    if (res.status === 401) throw new Error('Not authenticated');
    if (!res.ok) throw new Error(`Spotify API ${res.status}`);
    return res.json();
  }

  getCurrentlyPlaying() { return this.apiRequest('/me/player'); }
  play()     { return this.apiRequest('/me/player/play',     'PUT'); }
  pause()    { return this.apiRequest('/me/player/pause',    'PUT'); }
  next()     { return this.apiRequest('/me/player/next',     'POST'); }
  previous() { return this.apiRequest('/me/player/previous', 'POST'); }
  setVolume(percent) { return this.apiRequest(`/me/player/volume?volume_percent=${percent}`, 'PUT'); }
}

export const spotifyService = new SpotifyService();
