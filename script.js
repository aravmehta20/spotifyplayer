// --- CONFIG ---
const serverUrl = "https://spotify-auth-server-gamma.vercel.app";

// --- TOKEN HANDLING ---
const params = new URLSearchParams(window.location.search);
const accessToken = params.get("access_token");
const refreshToken = params.get("refresh_token"); // optional

// Simple debug to verify token presence
console.log("accessToken present?", !!accessToken);

// --- LOGIN BUTTON ---
const loginBtn = document.getElementById("login");
const playerUI = document.getElementById("player");

if (!accessToken) {
  loginBtn.onclick = () => (window.location.href = `${serverUrl}/api/login`);
} else {
  // Show UI immediately; we'll enable when SDK is ready
  loginBtn.style.display = "none";
  playerUI.style.display = "block";
}

let player;
let deviceId = null;
let isPaused = true;

// Ensure the SDK callback exists BEFORE the SDK fires
window.onSpotifyWebPlaybackSDKReady = () => {
  if (!accessToken) {
    console.warn("No access token; not initializing player.");
    return;
  }

  player = new Spotify.Player({
    name: "My Web Player",
    getOAuthToken: cb => cb(accessToken),
    volume: 0.7
  });

  // Ready
  player.addListener("ready", ({ device_id }) => {
    deviceId = device_id;
    console.log("Player ready; deviceId =", deviceId);
    loginBtn.style.display = "none";
    playerUI.style.display = "block";
  });

  // Errors (log them so we can see what’s up)
  ["initialization_error","authentication_error","account_error","playback_error"]
    .forEach(evt => player.addListener(evt, e => console.error(evt, e)));

  // Track state → update button icon
  const playBtn = document.getElementById("play");
  player.addListener("player_state_changed", s => {
    if (!s) return;
    isPaused = s.paused;
    playBtn.textContent = isPaused ? "▶️" : "⏸️";
  });

  // Make this browser the active device if needed
  async function ensureActive() {
    const r = await fetch("https://api.spotify.com/v1/me/player/devices", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const d = await r.json();
    const active = d.devices?.find(x => x.id === deviceId && x.is_active);
    if (!active) {
      await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ device_ids: [deviceId], play: false })
      });
    }
  }

  // Play/Pause (frontend-controlled, with SDK methods)
  document.getElementById("play").onclick = async () => {
    try {
      await ensureActive();
      const state = await player.getCurrentState();
      const pausedNow = state ? state.paused : isPaused;
      if (pausedNow) {
        await player.resume();
      } else {
        await player.pause();
      }
    } catch (e) {
      console.error("toggle failed", e);
    }
  };

  // Skip controls
  document.getElementById("prev").onclick = async () => {
    await fetch(`https://api.spotify.com/v1/me/player/previous?device_id=${encodeURIComponent(deviceId)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  };
  document.getElementById("next").onclick = async () => {
    await fetch(`https://api.spotify.com/v1/me/player/next?device_id=${encodeURIComponent(deviceId)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  };

  player.connect();
};

// --- Safety: if token exists but you still see only the login button ---
if (accessToken) {
  // If SDK didn’t call back in ~3s, something’s off (blocked SDK, wrong script order, etc.)
  setTimeout(() => {
    if (!player) {
      console.error("SDK not initialized. Check that the SDK script is loaded once and before this script.");
    }
  }, 3000);
}
