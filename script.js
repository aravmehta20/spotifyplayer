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

  // When the player is ready
  player.addListener("ready", ({ device_id }) => {
    deviceId = device_id;
    console.log("Spotify Web Player Ready:", device_id);

    document.getElementById("login").style.display = "none";
    document.getElementById("player").style.display = "block";
  });

  // Errors
  player.addListener("initialization_error", ({ message }) => console.error(message));
  player.addListener("authentication_error", ({ message }) => console.error(message));
  player.addListener("account_error", ({ message }) => console.error(message));
  player.addListener("playback_error", ({ message }) => console.error(message));

  player.connect();
};

// --- CONTROL PLAYBACK ---
async function callSpotify(endpoint, method = "PUT", body = {}) {
  return await fetch(`https://api.spotify.com/v1/me/player/${endpoint}?device_id=${deviceId}`, {
    method,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: Object.keys(body).length ? JSON.stringify(body) : undefined
  });
}
let playing = false;
document.getElementById("play").onclick = async () => {
  if (playing) {
    await callSpotify("pause", "PUT");
  } else {
    await callSpotify("play", "PUT");
  }
  playing = !playing;
};

document.getElementById("prev").onclick  = () => callSpotify("previous", "POST");
document.getElementById("next").onclick  = () => callSpotify("next", "POST");

// --- OPTIONAL: start a specific playlist ---
// async function playDefaultPlaylist() {
//   const playlistUri = "spotify:playlist:YOUR_PLAYLIST_ID";
//   await callSpotify("play", "PUT", { context_uri: playlistUri });
// }
