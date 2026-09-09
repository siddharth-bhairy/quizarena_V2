import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await api.signup(username, email, password);
      }
      const data = await api.login(username, password);
      login(data.access_token, username);
      navigate("/arena");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="top-band" style={{ flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
        <div className="pennant" />
        <div>
          <h1 className="top-band-title" style={{ fontSize: 32 }}>
            QuizArena
          </h1>
          <span className="top-band-sub">Fire vs. Ocean · Ranked Duels</span>
        </div>
      </div>

      <div className="screen" style={{ paddingTop: 26 }}>
        <p style={{ color: "var(--ink-muted)", marginBottom: 24, fontSize: 14 }}>
          Math questions run hot, Geography runs cool — pick a side and start climbing the rankings.
        </p>

        <div className="tabs">
          <button
            className={`tab-btn ${mode === "login" ? "active" : ""}`}
            onClick={() => setMode("login")}
            type="button"
          >
            Log in
          </button>
          <button
            className={`tab-btn ${mode === "signup" ? "active" : ""}`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            className="field"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {mode === "signup" && (
            <input
              className="field"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
          <input
            className="field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="error-text">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={loading} type="submit">
            {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Enter the arena"}
          </button>
        </form>
      </div>
    </>
  );
}
