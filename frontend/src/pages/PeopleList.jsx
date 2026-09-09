import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { api } from "../api.js";
import Avatar from "../components/Avatar.jsx";
import FollowButton from "../components/FollowButton.jsx";
import BottomNav from "../components/BottomNav.jsx";

const TITLES = {
  followers: (name) => `${name}'s Followers`,
  following: (name) => `${name} is Following`,
  browse: () => "Browse Players",
};

export default function PeopleList() {
  const { username, kind } = useParams(); // kind: "followers" | "following" | undefined (browse)
  const { token } = useAuth();
  const navigate = useNavigate();
  const [people, setPeople] = useState(null);
  const [error, setError] = useState("");

  const mode = kind || "browse";

  useEffect(() => {
    setPeople(null);
    const call =
      mode === "followers"
        ? api.getFollowers(username, token)
        : mode === "following"
        ? api.getFollowing(username, token)
        : api.listPlayers(token);

    call.then(setPeople).catch((err) => setError(err.message));
  }, [mode, username, token]);

  return (
    <>
      <div className="top-band">
        <div className="pennant pennant-sm" />
        <div>
          <span className="top-band-sub">Social</span>
          <h1 className="top-band-title" style={{ fontSize: 24 }}>
            {TITLES[mode](username)}
          </h1>
        </div>
      </div>

      <div className="screen" style={{ paddingTop: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
          ← Back
        </button>

        {error && <div className="empty-state">{error}</div>}

        {!error && people === null && <div className="empty-state">Loading…</div>}

        {!error && people?.length === 0 && (
          <div className="empty-state">
            {mode === "followers" && "No followers yet."}
            {mode === "following" && "Not following anyone yet."}
            {mode === "browse" && "No players yet."}
          </div>
        )}

        {people?.map((p) => (
          <div className="person-row" key={p.username}>
            <Avatar src={p.avatar_base64} name={p.username} size={40} />
            <div className="person-row-body">
              <div className="person-row-name">{p.username}</div>
              <div className="person-row-sub">
                {p.followers_count} followers · {p.following_count} following
              </div>
            </div>
            <FollowButton username={p.username} initialFollowing={p.is_following} />
          </div>
        ))}
      </div>
      <BottomNav />
    </>
  );
}
