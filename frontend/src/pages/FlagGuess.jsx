import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { api } from "../api.js";
import { COUNTRIES, flagUrl } from "../data/countries.js";
import BottomNav from "../components/BottomNav.jsx";
import QuitButton from "../components/QuitButton.jsx";

const ROUNDS = 8;
const SECONDS_PER_FLAG = 8;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRounds() {
  const pool = shuffle(COUNTRIES).slice(0, ROUNDS);
  return pool.map((correct) => {
    const distractors = shuffle(COUNTRIES.filter((c) => c.code !== correct.code)).slice(0, 3);
    return { correct, options: shuffle([correct, ...distractors]) };
  });
}

export default function FlagGuess() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const rounds = useMemo(buildRounds, []);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [seconds, setSeconds] = useState(SECONDS_PER_FLAG);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const round = rounds[index];

  const goNext = useCallback(
    (wasCorrect) => {
      if (wasCorrect) setCorrectCount((c) => c + 1);
      setSelected(null);
      setSeconds(SECONDS_PER_FLAG);
      if (index + 1 < rounds.length) {
        setIndex((i) => i + 1);
      } else {
        setDone(true);
      }
    },
    [index, rounds.length]
  );

  useEffect(() => {
    if (done || selected !== null) return;
    if (seconds <= 0) {
      goNext(false);
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, done, selected, goNext]);

  const score = Math.round((correctCount / rounds.length) * 100);

  useEffect(() => {
    if (done && !submitted) {
      setSubmitted(true);
      api.submitScore(token, "geography", "flag_guess", score, correctCount, rounds.length).catch(() => {});
    }
  }, [done, submitted, score, correctCount, rounds.length, token]);

  function handlePick(option) {
    if (selected !== null) return;
    const isCorrect = option.code === round.correct.code;
    setSelected(option.code);
    setTimeout(() => goNext(isCorrect), 500);
  }

  if (done) {
    return (
      <>
        <div className="screen">
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
              <div className="result-stat-value">{rounds.length}</div>
              <div className="result-stat-label">Flags</div>
            </div>
          </div>
          <button className="btn btn-primary btn-block" onClick={() => navigate("/arena")}>
            Back to Arena
          </button>
        </div>
        <BottomNav />
      </>
    );
  }

  return (
    <div className="screen">
      <div className="game-header">
        <div className="game-header-left">
          <span className="eyebrow">
            Geography · Flag {index + 1}/{rounds.length}
          </span>
          <span className={`timer-badge ${seconds <= 3 ? "low" : ""}`}>{seconds}s</span>
        </div>
        <QuitButton />
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${(index / rounds.length) * 100}%`, background: "var(--ocean)" }}
        />
      </div>

      <div className="flag-frame">
        <img src={flagUrl(round.correct.code)} alt="Guess this flag" />
      </div>

      {round.options.map((opt) => {
        let cls = "option-btn";
        if (selected) {
          if (opt.code === round.correct.code) cls += " correct";
          else if (opt.code === selected) cls += " wrong";
        }
        return (
          <button key={opt.code} className={cls} onClick={() => handlePick(opt)} disabled={selected !== null}>
            {opt.name}
          </button>
        );
      })}
    </div>
  );
}
