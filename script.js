// --- CONFIG ---
const serverUrl = "https://spotify-auth-server-gamma.vercel.app";

// --- TOKEN HANDLING ---
const params = new URLSearchParams(window.location.search);
let accessToken = params.get("access_token");
const refreshToken = params.get("refresh_token");

// --- LOGIN BUTTON ---
if (!accessToken) {
  document.getElementById("login").onclick = () => {
    window.location.href = `${serverUrl}/api/login`;
  };
}

// --- DEVICE + PLAYER ---
let player;
let deviceId = null;

window.onSpotifyWebPlaybackSDKReady = () => {
  if (!accessToken) return;

  player = new Spotify.Player({
    name: "My Web Player",
    getOAuthToken: cb => cb(accessToken),
    volume: 0.7
  });

  player.addListener("ready", ({ device_id }) => {
    deviceId = device_id;
    console.log("Spotify Web Player Ready:", device_id);

    document.getElementById("login").style.display = "none";
    document.getElementById("player").style.display = "block";
  });

  // --- Error logging ---
  player.addListener("initialization_error", ({ message }) => console.error(message));
  player.addListener("authentication_error", ({ message }) => console.error(message));
  player.addListener("account_error", ({ message }) => console.error(message));
  player.addListener("playback_error", ({ message }) => console.error(message));

  // --- PLAY / PAUSE TOGGLE ---
  const playBtn = document.getElementById("play");
  let isPaused = true;

  // Update icon from SDK state
  player.addListener("player_state_changed", (s) => {
    if (!s) return;
    isPaused = s.paused;
    playBtn.textContent = isPaused ? "▶️" : "⏸️";
  });

  // Ensure browser device is active
  async function ensureActiveDevice() {
    const r = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const d = await r.json();
    const active = d.devices?.find(x => x.id === deviceId && x.is_active);
    if (!active) {
      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: [deviceId], play: false })
      });
    }
  }

  playBtn.onclick = async () => {
    try {
      await ensureActiveDevice();
      const state = await player.getCurrentState();
      const pausedNow = state ? state.paused : isPaused;

      if (pausedNow) {
        // Resume playback
        const r = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!r.ok) {
          console.warn('API play failed, fallback to SDK resume');
          await player.resume();
        }
      } else {
        // Pause playback
        const r = await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${encodeURIComponent(deviceId)}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!r.ok) {
          console.warn('API pause failed, fallback to SDK pause');
          await player.pause();
        }
      }
    } catch (e) {
      console.error('Play/pause toggle failed:', e);
    }
  };

  // --- SKIP CONTROLS ---
  document.getElementById("prev").onclick = async () => {
    await fetch(`https://api.spotify.com/v1/me/player/previous?device_id=${deviceId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  };

  document.getElementById("next").onclick = async () => {
    await fetch(`https://api.spotify.com/v1/me/player/next?device_id=${deviceId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  };

  player.connect();
};
