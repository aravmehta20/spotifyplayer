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

  player.addListener("initialization_error", ({ message }) => console.error(message));
  player.addListener("authentication_error", ({ message }) => console.error(message));
  player.addListener("account_error", ({ message }) => console.error(message));
  player.addListener("playback_error", ({ message }) => console.error(message));

  // ensure your HTML play button is: <button id="play" type="button">▶️</button>
const playBtn = document.getElementById("play");
let isPaused = true; // local state

// Keep local state in sync with the SDK
player.addListener("player_state_changed", (s) => {
  if (!s) return;                 // s can be null if device not active yet
  isPaused = s.paused;
  playBtn.textContent = isPaused ? "▶️" : "⏸️";
});

// If the web player isn't the active device yet, make it active
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

// Explicit toggle logic
playBtn.onclick = async () => {
  try {
    await ensureActiveDevice();

    // Re-check current state (SDK can lag a tick)
    const state = await player.getCurrentState();
    const pausedNow = state ? state.paused : isPaused;

    if (pausedNow) {
      // Resume/start
      await player.resume().catch(async () => {
        // Fallback: force play via Web API if SDK resume fails
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      });
    } else {
      // Pause
      await player.pause().catch(async () => {
        // Fallback: explicit API pause
        await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${encodeURIComponent(deviceId)}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      });
    }
  } catch (e) {
    console.error('play/pause toggle failed:', e);
  }
};

};
