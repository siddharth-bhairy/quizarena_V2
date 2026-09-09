import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import BottomNav from "../components/BottomNav.jsx";
import FollowButton from "../components/FollowButton.jsx";

const TABS = [
  { id: "math", label: "Math" },
  { id: "geography", label: "Geography" },
];

export default function Leaderboard() {
  const { username, token } = useAuth();
  const [tab, setTab] = useState("math");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingSet, setFollowingSet] = useState(new Set());

  useEffect(() => {
    setLoading(true);
    api
      .leaderboard(tab)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    if (!username) return;
    api
      .getFollowing(username, token)
      .then((people) => setFollowingSet(new Set(people.map((p) => p.username))))
      .catch(() => {});
  }, [username, token]);

  return (
    <>
      <div className="top-band">
        <div className="pennant pennant-sm" />
        <div>
          <span className="top-band-sub">Rankings</span>
          <h1 className="top-band-title">Leaderboard</h1>
        </div>
      </div>

      <div className="screen" style={{ paddingTop: 20 }}>
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="empty-state">Loading…</div>}

        {!loading && rows.length === 0 && (
          <div className="empty-state">No scores yet for this category. Be the first to play.</div>
        )}

        {!loading &&
          rows.map((row, i) => (
            <div className="leader-row" key={row.username}>
              {i === 0 ? (
                <span className="pennant pennant-sm" style={{ width: 22, height: 22 }} />
              ) : (
                <span className="leader-rank">{i + 1}</span>
              )}
              <span className="leader-name">{row.username}</span>
              <span className="leader-score">{row.best_score}</span>
              <FollowButton username={row.username} initialFollowing={followingSet.has(row.username)} />
            </div>
          ))}
      </div>
      <BottomNav />
    </>
  );
}
