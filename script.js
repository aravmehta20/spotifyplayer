// --- CONFIG ---
const serverUrl = "https://spotify-auth-server-gamma.vercel.app";

// --- TOKEN HANDLING ---
const params = new URLSearchParams(window.location.search);
const accessToken = params.get("access_token");

// --- LOGIN BUTTON ---
if (!accessToken) {
  document.getElementById("login").onclick = () => {
    window.location.href = `${serverUrl}/api/login`;
  };
  throw new Error("Not logged in yet");
}

// --- DEVICE + PLAYER ---
let player, deviceId, isPaused = true;

window.onSpotifyWebPlaybackSDKReady = () => {
  player = new Spotify.Player({
    name: "My Web Player",
    getOAuthToken: cb => cb(accessToken),
    volume: 0.7,
  });

  // Ready
  player.addListener("ready", ({ device_id }) => {
    deviceId = device_id;
    document.getElementById("login").style.display = "none";
    document.getElementById("player").style.display = "block";
    console.log("Player ready:", device_id);
  });

  // Errors
  ["initialization_error","authentication_error","account_error","playback_error"]
    .forEach(ev => player.addListener(ev, e => console.error(ev, e.message)));

  // Track state
  const playBtn = document.getElementById("play");
  player.addListener("player_state_changed", s => {
    if (!s) return;
    isPaused = s.paused;
    playBtn.textContent = isPaused ? "▶️" : "⏸️";
  });

  // Ensure browser is active device
  async function ensureActive() {
    const r = await fetch("https://api.spotify.com/v1/me/player/devices", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const d = await r.json();
    const active = d.devices.find(x => x.id === deviceId && x.is_active);
    if (!active) {
      await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ device_ids: [deviceId], play: false }),
      });
    }
  }

  // Play / Pause toggle (frontend handled)
  playBtn.onclick = async () => {
    try {
      await ensureActive();
      const state = await player.getCurrentState();
      const paused = state ? state.paused : isPaused;
      if (paused) {
        await player.resume();
      } else {
        await player.pause();
      }
    } catch (e) {
      console.error("Toggle failed", e);
    }
  };

  // Skip controls
  document.getElementById("prev").onclick = async () => {
    await fetch(`https://api.spotify.com/v1/me/player/previous?device_id=${deviceId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  };

  document.getElementById("next").onclick = async () => {
    await fetch(`https://api.spotify.com/v1/me/player/next?device_id=${deviceId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  };

  player.connect();
};
