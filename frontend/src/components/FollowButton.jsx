import { useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { api } from "../api.js";

export default function FollowButton({ username, initialFollowing, onChange }) {
  const { token, username: myUsername } = useAuth();
  const [following, setFollowing] = useState(!!initialFollowing);
  const [busy, setBusy] = useState(false);

  if (!token || username === myUsername) return null;

  async function toggle() {
    setBusy(true);
    try {
      const result = following ? await api.unfollow(token, username) : await api.follow(token, username);
      setFollowing(result.is_following);
      onChange?.(result);
    } catch {
      /* non-fatal for the demo */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={`follow-btn ${following ? "following" : ""}`}
      onClick={toggle}
      disabled={busy}
      type="button"
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
