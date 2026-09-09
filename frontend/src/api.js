const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export function wsUrl(path) {
  return `${API_URL.replace(/^http/, "ws")}${path}`;
}

function authHeaders(token) {
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* response wasn't JSON — keep statusText */
    }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  signup: (username, email, password) =>
    fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ username, email, password }),
    }).then(handle),

  login: (username, password) => {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    return fetch(`${API_URL}/auth/login`, { method: "POST", body: form }).then(handle);
  },

  startGame: (token, category, numQuestions = 5) =>
    fetch(`${API_URL}/game/start`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ category, num_questions: numQuestions }),
    }).then(handle),

  submitGame: (token, category, difficulty, answers) =>
    fetch(`${API_URL}/game/submit`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ category, difficulty, answers }),
    }).then(handle),

  submitScore: (token, category, mode, score, correctCount = 0, totalQuestions = 0) =>
    fetch(`${API_URL}/game/submit-score`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        category,
        mode,
        score,
        correct_count: correctCount,
        total_questions: totalQuestions,
      }),
    }).then(handle),

  leaderboard: (category) => fetch(`${API_URL}/leaderboard/${category}`).then(handle),

  getMe: (token) => fetch(`${API_URL}/auth/me`, { headers: authHeaders(token) }).then(handle),

  updateAvatar: (token, avatarBase64) =>
    fetch(`${API_URL}/auth/me/avatar`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ avatar_base64: avatarBase64 }),
    }).then(handle),

  getPublicProfile: (username, token) =>
    fetch(`${API_URL}/social/users/${username}`, { headers: authHeaders(token) }).then(handle),

  follow: (token, username) =>
    fetch(`${API_URL}/social/follow/${username}`, { method: "POST", headers: authHeaders(token) }).then(
      handle
    ),

  unfollow: (token, username) =>
    fetch(`${API_URL}/social/follow/${username}`, { method: "DELETE", headers: authHeaders(token) }).then(
      handle
    ),

  getFollowers: (username, token) =>
    fetch(`${API_URL}/social/followers/${username}`, { headers: authHeaders(token) }).then(handle),

  getFollowing: (username, token) =>
    fetch(`${API_URL}/social/following/${username}`, { headers: authHeaders(token) }).then(handle),

  listPlayers: (token) => fetch(`${API_URL}/social/users`, { headers: authHeaders(token) }).then(handle),
};

export { API_URL };
