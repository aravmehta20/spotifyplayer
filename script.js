const params = new URLSearchParams(window.location.search);
const access_token = params.get('access_token');
const refresh_token = params.get('refresh_token');
const serverUrl = 'https://spotify-auth-server-gamma.vercel.app';

const loginBtn = document.getElementById('login');
const playerDiv = document.getElementById('player');

if (!access_token) {
  loginBtn.onclick = () => {
    window.location.href = `${serverUrl}/api/login`;
  };
} else {
  loginBtn.style.display = 'none';
  playerDiv.style.display = 'block';

  async function controlPlayback(action) {
    const endpoints = {
      play: 'https://api.spotify.com/v1/me/player/play',
      pause: 'https://api.spotify.com/v1/me/player/pause',
      next: 'https://api.spotify.com/v1/me/player/next',
      prev: 'https://api.spotify.com/v1/me/player/previous',
    };

    try {
      await fetch(endpoints[action], {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${access_token}` },
      });
    } catch (err) {
      console.error('Playback control error:', err);
    }
  }

  document.getElementById('play').onclick = async () => {
    const currentState = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    }).then(r => r.json());
    if (currentState.is_playing) controlPlayback('pause');
    else controlPlayback('play');
  };

  document.getElementById('next').onclick = () => controlPlayback('next');
  document.getElementById('prev').onclick = () => controlPlayback('prev');
}
