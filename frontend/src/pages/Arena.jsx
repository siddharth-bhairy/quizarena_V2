import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { api } from "../api.js";
import CategoryTile from "../components/CategoryTile.jsx";
import ModeCard from "../components/ModeCard.jsx";
import BottomNav from "../components/BottomNav.jsx";
import Avatar from "../components/Avatar.jsx";

const CATEGORIES = [
  { id: "math", label: "Math", sub: "Fire arena", accent: "var(--fire)" },
  { id: "geography", label: "Geography", sub: "Ocean arena", accent: "var(--ocean)" },
];

export default function Arena() {
  const { username, token } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState("math");
  const [ratings, setRatings] = useState({});
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    ["math", "geography"].forEach(async (cat) => {
      try {
        const board = await api.leaderboard(cat);
        const mine = board.find((row) => row.username === username);
        setRatings((prev) => ({ ...prev, [cat]: 1000 + (mine ? mine.best_score * 3 : 0) }));
      } catch {
        setRatings((prev) => ({ ...prev, [cat]: 1000 }));
      }
    });

    api
      .getMe(token)
      .then((me) => setAvatar(me.avatar_base64))
      .catch(() => {});
  }, [username, token]);

  return (
    <>
      <div className="top-band">
        <Avatar src={avatar} name={username} size={48} />
        <div>
          <span className="top-band-sub">Welcome back</span>
          <h1 className="top-band-title">{username}</h1>
        </div>
      </div>

      <div className="screen" style={{ paddingTop: 20 }}>
        <span className="eyebrow">Choose your arena</span>
        <div className="cat-list" style={{ margin: "10px 0 26px" }}>
          {CATEGORIES.map((cat) => (
            <CategoryTile
              key={cat.id}
              id={cat.id}
              label={cat.label}
              sub={cat.sub}
              accent={cat.accent}
              rating={ratings[cat.id]}
              active={active === cat.id}
              disabled={cat.disabled}
              onClick={() => setActive(cat.id)}
            />
          ))}
        </div>

        {active === "math" && (
          <>
            <span className="eyebrow">Math modes</span>
            <div className="mode-list" style={{ marginTop: 10 }}>
              <ModeCard
                index="01"
                eyebrow="Classic"
                title="Speed Quiz"
                subtitle="5 multiple-choice questions. Difficulty adapts to your accuracy over time."
                accent="var(--fire)"
                onClick={() => navigate("/quiz/math")}
              />
              <ModeCard
                index="02"
                eyebrow="Duel"
                title="Flash Anzan"
                subtitle="Numbers flash on screen, one at a time — add them up before the round ends."
                accent="var(--fire-deep)"
                onClick={() => navigate("/flash-anzan")}
              />
              <ModeCard
                index="03"
                eyebrow="Live"
                title="Multiplayer Duel"
                subtitle="Join a room with a friend and answer the same live questions head-to-head."
                accent="var(--fire)"
                onClick={() => navigate("/duel/math")}
              />
            </div>
          </>
        )}

        {active === "geography" && (
          <>
            <span className="eyebrow">Geography modes</span>
            <div className="mode-list" style={{ marginTop: 10 }}>
              <ModeCard
                index="01"
                eyebrow="Classic"
                title="Speed Quiz"
                subtitle="5 multiple-choice questions on capitals, geography & more."
                accent="var(--ocean)"
                onClick={() => navigate("/quiz/geography")}
              />
              <ModeCard
                index="02"
                eyebrow="Duel"
                title="Flag Guess"
                subtitle="A flag renders full-screen — name the country before the clock runs out."
                accent="var(--ocean-deep)"
                onClick={() => navigate("/flag-guess")}
              />
              <ModeCard
                index="03"
                eyebrow="Live"
                title="Multiplayer Duel"
                subtitle="Join a room with a friend and answer the same live questions head-to-head."
                accent="var(--ocean)"
                onClick={() => navigate("/duel/geography")}
              />
            </div>
          </>
        )}

      </div>
      <BottomNav />
    </>
  );
}
