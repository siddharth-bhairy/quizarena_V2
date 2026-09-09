import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("quizarena_token"));
  const [username, setUsername] = useState(() => localStorage.getItem("quizarena_username"));
  // "checking" avoids a flash of the logged-in UI (or a false redirect to
  // /login) while we confirm a stored token is still valid server-side.
  const [status, setStatus] = useState(token ? "checking" : "guest");

  const login = useCallback((newToken, newUsername) => {
    localStorage.setItem("quizarena_token", newToken);
    localStorage.setItem("quizarena_username", newUsername);
    setToken(newToken);
    setUsername(newUsername);
    setStatus("authed");
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("quizarena_token");
    localStorage.removeItem("quizarena_username");
    setToken(null);
    setUsername(null);
    setStatus("guest");
  }, []);

  // On first load, a token in localStorage is just a claim, not proof.
  // Confirm it against the backend once before treating the session as
  // real — this is what catches a stale token left over from a wiped or
  // redeployed database (the token decodes fine, but the user it points
  // to no longer exists).
  useEffect(() => {
    if (!token) {
      setStatus("guest");
      return;
    }
    let cancelled = false;
    api
      .getMe(token)
      .then((me) => {
        if (cancelled) return;
        localStorage.setItem("quizarena_username", me.username);
        setUsername(me.username);
        setStatus("authed");
      })
      .catch(() => {
        if (cancelled) return;
        logout();
      });
    return () => {
      cancelled = true;
    };
    // Intentionally only re-runs when the token itself changes (e.g. a
    // fresh login), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthContext.Provider
      value={{ token, username, login, logout, isAuthed: status === "authed", isChecking: status === "checking" }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
