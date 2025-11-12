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
    document.getElementById("login").style.display = "none";
    document.getElementById("player").style.display = "block";

    // bind after deviceId is known
    document.getElementById("play").onclick  = () => callSpotify("play",  "PUT", {});
    document.getElementById("pause").onclick = () => callSpotify("pause", "PUT", {});
    document.getElementById("prev").onclick  = () => callSpotify("previous", "POST");
    document.getElementById("next").onclick  = () => callSpotify("next", "POST");
  });

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


// --- OPTIONAL: start a specific playlist ---

 async function playPlaylist() {
   const playlistID = document.getElementById("userInput").value.replace(/.*\/playlist\/([^?]+)\?.*/, "$1");
   const playlistUri = "spotify:playlist:"+playlistID;
   console.log("playlistUri:", playlistUri);
  await callSpotify("play", "PUT", { context_uri: playlistUri });
 }

document.getElementById("submitPlaylistID").addEventListener("click", () => {
    playPlaylist();
});

async function getCurrentTrack() {
  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });

  if (res.status === 204 || res.status > 400) {
    console.log("No song currently playing");
    return;
  }

  const data = await res.json();
  const track = data.item;
  const trackName = track.name;
  const artistName = track.artists.map(a => a.name).join(", ");

  console.log(`Now playing: ${trackName} — ${artistName}`);
  document.getElementById("currentTrack").innerText = `${trackName} — ${artistName}`;
}

setInterval(getCurrentTrack, 5000); // every 5 seconds

