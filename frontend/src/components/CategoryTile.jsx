const ICONS = {
  math: "➗",
  geography: "🌍",
  memory: "🧠",
  logic: "🧩",
};

export default function CategoryTile({ id, label, sub, active, disabled, onClick, accent }) {
  return (
    <button
      className="cat-row"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ borderLeftColor: active ? accent : "var(--border-strong)" }}
    >
      <span className="cat-row-icon">{ICONS[id] || "★"}</span>
      <span className="cat-row-body">
        <span className="cat-row-label" style={{ color: active ? accent : "var(--ink)" }}>
          {label}
        </span>
        <div className="cat-row-sub">{sub}</div>
      </span>
    </button>
  );
}