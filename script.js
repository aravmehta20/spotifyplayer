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

  // 👇 Moved here — after player is created
  const playBtn = document.getElementById("play");
  player.addListener("player_state_changed", (s) => {
    if (!s) return;
    playBtn.textContent = s.paused ? "▶️" : "⏸️";
  });
  playBtn.onclick = () => player.togglePlay();

  player.connect();
};
