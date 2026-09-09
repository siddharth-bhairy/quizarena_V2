import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { api } from "../api.js";
import Avatar from "../components/Avatar.jsx";
import BottomNav from "../components/BottomNav.jsx";

const MAX_DIMENSION = 240; // px — kept small since it's stored as base64 text in the DB

function resizeImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like a valid image"));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const { username, token, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [avatar, setAvatar] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ followers_count: 0, following_count: 0 });

  useEffect(() => {
    api
      .getMe(token)
      .then((me) => setAvatar(me.avatar_base64))
      .catch(() => {});

    api
      .getPublicProfile(username, token)
      .then(setStats)
      .catch(() => {});
  }, [token, username]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      const updated = await api.updateAvatar(token, dataUrl);
      setAvatar(updated.avatar_base64);
    } catch (err) {
      setError(err.message || "Couldn't update your photo");
    } finally {
      setUploading(false);
      e.target.value = ""; // allow re-selecting the same file later
    }
  }

  return (
    <>
      <div className="top-band">
        <Avatar src={avatar} name={username} size={48} />
        <div>
          <span className="top-band-sub">Your account</span>
          <h1 className="top-band-title">Profile</h1>
        </div>
      </div>

      <div className="screen" style={{ paddingTop: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <Avatar src={avatar} name={username} size={104} />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 14 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : avatar ? "Change photo" : "Add a photo"}
          </button>
          {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        </div>

        <div className="profile-stats">
          <div className="profile-stat" onClick={() => navigate(`/players/${username}/followers`)}>
            <div className="profile-stat-value">{stats.followers_count}</div>
            <div className="profile-stat-label">Followers</div>
          </div>
          <div className="profile-stat" onClick={() => navigate(`/players/${username}/following`)}>
            <div className="profile-stat-value">{stats.following_count}</div>
            <div className="profile-stat-label">Following</div>
          </div>
        </div>

        <button className="btn btn-ghost btn-block" onClick={() => navigate("/players")}>
          Browse players
        </button>

        <div className="cat-row" style={{ cursor: "default", marginTop: 20 }}>
          <span className="cat-row-icon">●</span>
          <span className="cat-row-body">
            <span className="cat-row-label" style={{ fontSize: 16 }}>
              {username}
            </span>
            <div className="cat-row-sub">Signed in</div>
          </span>
        </div>

        <button
          className="btn btn-danger-ghost btn-block"
          style={{ marginTop: 20 }}
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Log out
        </button>
      </div>
      <BottomNav />
    </>
  );
}
