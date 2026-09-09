import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { api } from "../api.js";
import BottomNav from "../components/BottomNav.jsx";
import QuitButton from "../components/QuitButton.jsx";

const ROUNDS = 3;
const NUMBERS_PER_ROUND = 5;
const FLASH_MS = 850;
const GAP_MS = 200;

function generateRound() {
  const numbers = [];
  let running = 0;
  for (let i = 0; i < NUMBERS_PER_ROUND; i++) {
    let n;
    if (i === 0) {
      n = 5 + Math.floor(Math.random() * 20); // first number always positive
    } else {
      const max = Math.min(30, running + 15); // keep the running sum from going negative-heavy
      n = Math.floor(Math.random() * (max + 15)) - 15;
      if (n === 0) n = 3;
    }
    numbers.push(n);
    running += n;
  }
  return { numbers, sum: running };
}

export default function FlashAnzan() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("idle"); // idle | flashing | blank | answering | reveal | done
  const [round, setRound] = useState(null);
  const [roundIdx, setRoundIdx] = useState(0);
  const [flashIdx, setFlashIdx] = useState(0);
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]); // [{correct: bool, sum, guess}]
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef(null);

  function startGame() {
    setResults([]);
    setRoundIdx(0);
    beginRound();
  }

  function beginRound() {
    const r = generateRound();
    setRound(r);
    setFlashIdx(0);
    setInput("");
    setPhase("flashing");
  }

  // drive the flash sequence
  useEffect(() => {
    if (phase !== "flashing" || !round) return;
    if (flashIdx >= round.numbers.length) {
      setPhase("answering");
      return;
    }
    timerRef.current = setTimeout(() => {
      setPhase("blank");
    }, FLASH_MS);
    return () => clearTimeout(timerRef.current);
  }, [phase, flashIdx, round]);

  useEffect(() => {
    if (phase !== "blank") return;
    timerRef.current = setTimeout(() => {
      setFlashIdx((i) => i + 1);
      setPhase("flashing");
    }, GAP_MS);
    return () => clearTimeout(timerRef.current);
  }, [phase]);

  function submitAnswer(e) {
    e.preventDefault();
    const guess = parseInt(input, 10);
    const correct = guess === round.sum;
    setResults((prev) => [...prev, { correct, sum: round.sum, guess: input }]);
    setPhase("reveal");

    setTimeout(() => {
      if (roundIdx + 1 < ROUNDS) {
        setRoundIdx((i) => i + 1);
        beginRound();
      } else {
        setPhase("done");
      }
    }, 1400);
  }

  const correctCount = results.filter((r) => r.correct).length;
  const score = Math.round((correctCount / ROUNDS) * 100);

  useEffect(() => {
    if (phase === "done" && !submitted) {
      setSubmitted(true);
      api
        .submitScore(token, "math", "flash_anzan", score, correctCount, ROUNDS)
        .catch(() => {
          /* non-fatal for the demo — still show the result on screen */
        });
    }
  }, [phase, submitted, score, correctCount, token]);

  return (
    <>
      <div className="screen">
        <div className="game-header">
          <div className="game-header-left">
            <span className="eyebrow">Math · Flash Anzan</span>
            {phase !== "idle" && phase !== "done" && (
              <span className="tag tag-fire">
                Round {Math.min(roundIdx + 1, ROUNDS)}/{ROUNDS}
              </span>
            )}
          </div>
          {phase !== "idle" && phase !== "done" && <QuitButton />}
        </div>

        {phase === "idle" && (
          <>
            <h2 className="question-text">Numbers flash on screen, one at a time. Add them up.</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 28 }}>
              {NUMBERS_PER_ROUND} numbers per round, {ROUNDS} rounds. Green means add, red means
              subtract. Type the running total once the sequence ends.
            </p>
            <button className="btn btn-primary btn-block" onClick={startGame}>
              Start duel
            </button>
          </>
        )}

        {(phase === "flashing" || phase === "blank") && round && (
          <div className="anzan-stage">
            {phase === "flashing" && (
              <span className={`anzan-number ${round.numbers[flashIdx] >= 0 ? "pos" : "neg"}`}>
                {round.numbers[flashIdx] >= 0 ? "+" : ""}
                {round.numbers[flashIdx]}
              </span>
            )}
          </div>
        )}

        {phase === "answering" && (
          <form onSubmit={submitAnswer}>
            <div className="anzan-stage">
              <span style={{ color: "var(--text-faint)", fontSize: 14 }}>What's the total?</span>
            </div>
            <input
              className="field anzan-input"
              type="number"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="0"
              required
            />
            <button className="btn btn-primary btn-block" type="submit">
              Lock in answer
            </button>
          </form>
        )}

        {phase === "reveal" && (
          <div className="anzan-stage">
            <div style={{ textAlign: "center" }}>
              <div
                className="anzan-number"
                style={{ fontSize: 40 }}
                data-ok={results[results.length - 1]?.correct}
              >
                {results[results.length - 1]?.correct ? "✅ Correct!" : "❌ Not quite"}
              </div>
              <div style={{ color: "var(--text-muted)", marginTop: 8 }}>
                Answer was <strong style={{ color: "var(--text)" }}>{round.sum}</strong>
              </div>
            </div>
          </div>
        )}

        {phase === "done" && (
          <>
            <div className="result-hero">
              <div className="result-score">{score}</div>
              <div className="result-label">points scored</div>
            </div>
            <div className="result-stats">
              <div className="result-stat">
                <div className="result-stat-value">{correctCount}</div>
                <div className="result-stat-label">Correct</div>
              </div>
              <div className="result-stat">
                <div className="result-stat-value">{ROUNDS}</div>
                <div className="result-stat-label">Rounds</div>
              </div>
            </div>
            <button className="btn btn-primary btn-block" onClick={() => navigate("/arena")}>
              Back to Arena
            </button>
          </>
        )}
      </div>
      <BottomNav />
    </>
  );
}
