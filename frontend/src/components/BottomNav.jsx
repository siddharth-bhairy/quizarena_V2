import { useNavigate, useLocation } from "react-router-dom";

const ITEMS = [
  { path: "/arena", label: "Arena", glyph: "▲" },
  { path: "/leaderboard", label: "Ranks", glyph: "▤" },
  { path: "/profile", label: "Profile", glyph: "●" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      <div className="nav-brand" onClick={() => navigate("/arena")}>
        <span className="pennant pennant-sm" />
        <span className="nav-brand-text">QuizArena</span>
      </div>
      {ITEMS.map((item) => {
        const active = location.pathname.startsWith(item.path);
        return (
          <button
            key={item.path}
            className={`nav-item ${active ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-glyph">{item.glyph}</span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
