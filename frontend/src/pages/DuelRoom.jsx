import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { wsUrl } from "../api.js";
import BottomNav from "../components/BottomNav.jsx";
import QuitButton from "../components/QuitButton.jsx";

const ACCENT = { math: "var(--fire)", geography: "var(--ocean)" };

const CODE_WORDS = [
  "tiger", "comet", "maple", "storm", "delta", "ember", "falcon", "granite",
  "harbor", "ivory", "jaguar", "kite", "lunar", "nova", "onyx", "quartz",
  "raven", "summit", "thunder", "willow",
];

function generateRoomCode() {
  const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
  const num = Math.floor(10 + Math.random() * 90); // 2-digit suffix
  return `${word}-${num}`;
}

export default function DuelRoom() {
  const { category } = useParams();
  const { token, username } = useAuth();
  const navigate = useNavigate();
  const accent = ACCENT[category] || "var(--fire)";

  const [roomId, setRoomId] = useState("");
  const [phase, setPhase] = useState("lobby"); // lobby | connecting | waiting | question | reveal | done
  const [players, setPlayers] = useState([]);
  const [question, setQuestion] = useState(null); // {index,total,question_id,text,options,seconds}
  const [selected, setSelected] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [revealInfo, setRevealInfo] = useState(null); // {correct_index, leaderboard}
  const [finalBoard, setFinalBoard] = useState([]);
  const [error, setError] = useState("");
  const wsRef = useRef(null);

  useEffect(() => {
    return () => wsRef.current?.close();
  }, []);

  // client-side countdown display, purely visual — the server is the
  // source of truth for when a question actually ends
  useEffect(() => {
    if (phase !== "question" || seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, seconds]);

  function joinRoom() {
    const code = roomId.trim();
    if (!code) return;
    setError("");
    setPhase("connecting");

    const socket = new WebSocket(wsUrl(`/ws/room/${encodeURIComponent(code)}?token=${token}&category=${category}`));
    wsRef.current = socket;

    socket.onopen = () => setPhase("waiting");

    socket.onerror = () => setError("Couldn't connect to that room. Check the backend is running.");

    socket.onclose = () => {
      setPhase((p) => (p === "done" ? p : "lobby"));
    };

    socket.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type === "player_joined" || msg.type === "player_left") {
        setPlayers(msg.players);
      } else if (msg.type === "question") {
        setQuestion(msg);
        setSelected(null);
        setSeconds(msg.seconds);
        setRevealInfo(null);
        setPhase("question");
      } else if (msg.type === "reveal") {
        setRevealInfo(msg);
        setPhase("reveal");
      } else if (msg.type === "game_over") {
        setFinalBoard(msg.leaderboard);
        setPhase("done");
      }
    };
  }

  function startDuel() {
    wsRef.current?.send(JSON.stringify({ action: "start" }));
  }

  function answer(i) {
    if (selected !== null) return;
    setSelected(i);
    wsRef.current?.send(JSON.stringify({ action: "answer", question_id: question.question_id, selected_index: i }));
  }

  function leaveRoom() {
    wsRef.current?.close();
    navigate("/arena");
  }

  return (
    <>
      <div className="screen">
        <div className="game-header">
          <span className="eyebrow">{category} · Live Duel</span>
          {phase !== "lobby" && <QuitButton confirmMessage="Leave the duel room?" />}
        </div>

        {phase === "lobby" && (
          <>
            <h2 className="question-text">Play head-to-head, live.</h2>
            <p style={{ color: "var(--ink-muted)", fontSize: 14, marginBottom: 20 }}>
              Pick a room code and share it with a friend — whoever joins the same code lands in the
              same room. Once everyone's in, anyone can start the round.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="field"
                placeholder="Room code, e.g. friday-duel"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => setRoomId(generateRoomCode())}
                style={{ height: 48 }}
              >
                Generate
              </button>
            </div>
            {error && <div className="error-text">{error}</div>}
            <button className="btn btn-primary btn-block" onClick={joinRoom} disabled={!roomId.trim()}>
              Join room
            </button>
          </>
        )}

        {phase === "connecting" && <div className="empty-state">Connecting…</div>}

        {phase === "waiting" && (
          <>
            <span className="tag" style={{ borderColor: accent, color: accent, marginBottom: 14 }}>
              Room: {roomId}
            </span>
            <h3 className="mode-card-title" style={{ marginBottom: 10 }}>
              Players in room
            </h3>
            {players.map((p) => (
              <div className="person-row" key={p}>
                <div className="person-row-body">
                  <div className="person-row-name">
                    {p} {p === username && "(you)"}
                  </div>
                </div>
              </div>
            ))}
            <p style={{ color: "var(--ink-faint)", fontSize: 12.5, margin: "14px 0" }}>
              Need at least one other player to make it a real duel — solo works too, for testing.
            </p>
            <button className="btn btn-primary btn-block" onClick={startDuel}>
              Start duel
            </button>
          </>
        )}

        {phase === "question" && question && (
          <>
            <div className="game-header" style={{ marginBottom: 8 }}>
              <span className="eyebrow">
                Q{question.index + 1}/{question.total}
              </span>
              <span className={`timer-badge ${seconds <= 3 ? "low" : ""}`}>{seconds}s</span>
            </div>
            <h2 className="question-text">{question.text}</h2>
            {question.options.map((opt, i) => (
              <button
                key={i}
                className={`option-btn ${selected === i ? "selected" : ""}`}
                onClick={() => answer(i)}
                disabled={selected !== null}
              >
                {opt}
              </button>
            ))}
          </>
        )}

        {phase === "reveal" && revealInfo && (
          <>
            <h3 className="mode-card-title" style={{ marginBottom: 14 }}>
              Standings
            </h3>
            {revealInfo.leaderboard.map((row, i) => (
              <div className="leader-row" key={row.username}>
                <span className="leader-rank">{i + 1}</span>
                <span className="leader-name">
                  {row.username} {row.username === username && "(you)"}
                </span>
                <span className="leader-score">{row.score}</span>
              </div>
            ))}
          </>
        )}

        {phase === "done" && (
          <>
            <div className="result-hero">
              <div className="result-score">{finalBoard[0]?.score ?? 0}</div>
              <div className="result-label">winning score</div>
            </div>
            {finalBoard.map((row, i) => (
              <div className="leader-row" key={row.username}>
                {i === 0 ? (
                  <span className="pennant pennant-sm" style={{ width: 22, height: 22 }} />
                ) : (
                  <span className="leader-rank">{i + 1}</span>
                )}
                <span className="leader-name">
                  {row.username} {row.username === username && "(you)"}
                </span>
                <span className="leader-score">{row.score}</span>
              </div>
            ))}
            <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={leaveRoom}>
              Back to Arena
            </button>
          </>
        )}

        {phase !== "lobby" && phase !== "connecting" && phase !== "done" && (
          <button className="btn btn-ghost btn-block" style={{ marginTop: 16 }} onClick={leaveRoom}>
            Leave room
          </button>
        )}
      </div>
      <BottomNav />
    </>
  );
}
