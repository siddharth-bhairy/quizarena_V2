export default function Avatar({ src, name, size = 44 }) {
  if (src) {
    return (
      <img
        className="avatar"
        src={src}
        alt={`${name || "User"}'s profile photo`}
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div className="avatar avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {initial}
    </div>
  );
}
