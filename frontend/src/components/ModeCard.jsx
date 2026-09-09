export default function ModeCard({ index, eyebrow, title, subtitle, accent, onClick }) {
  return (
    <button className="mode-card" onClick={onClick}>
      <span className="mode-card-index" style={{ "--mode-accent": accent }}>
        {index}
      </span>
      <span className="mode-card-content">
        <span className="mode-card-top">
          <h3 className="mode-card-title">{title}</h3>
          <span className="tag" style={{ borderColor: accent, color: accent }}>
            {eyebrow}
          </span>
        </span>
        <p className="mode-card-subtitle">{subtitle}</p>
      </span>
    </button>
  );
}
