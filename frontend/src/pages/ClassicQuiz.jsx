import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { api } from "../api.js";
import BottomNav from "../components/BottomNav.jsx";
import QuitButton from "../components/QuitButton.jsx";

const ACCENT = { math: "var(--fire)", geography: "var(--ocean)" };
const QUESTION_SECONDS = 20;

export default function ClassicQuiz() {
  const { category } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [seconds, setSeconds] = useState(QUESTION_SECONDS);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .startGame(token, category, 5)
      .then((data) => setQuestions(data.questions))
      .catch((err) => setError(err.message));
  }, [category, token]);

  const goNext = useCallback(
    (chosenIndex) => {
      const q = questions[index];
      const nextAnswers = [...answers, { question_id: q.id, selected_index: chosenIndex ?? -1 }];
      setAnswers(nextAnswers);
      setSelected(null);
      setSeconds(QUESTION_SECONDS);

      if (index + 1 < questions.length) {
        setIndex(index + 1);
      } else {
        api
          .submitGame(token, category, questions[0]?.difficulty || "easy", nextAnswers)
          .then(setResult)
          .catch((err) => setError(err.message));
      }
    },
    [answers, index, questions, token, category]
  );

  // per-question countdown
  useEffect(() => {
    if (!questions || result) return;
    if (seconds <= 0) {
      goNext(null);
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, questions, result, goNext]);

  if (error) {
    return (
      <div className="screen">
        <div className="empty-state">{error}</div>
        <button className="btn btn-ghost btn-block" onClick={() => navigate("/arena")}>
          Back to Arena
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <>
        <div className="screen">
          <div className="result-hero">
            <div className="result-score">{result.score}</div>
            <div className="result-label">points scored</div>
          </div>
          <div className="result-stats">
            <div className="result-stat">
              <div className="result-stat-value">{result.correct_count}</div>
              <div className="result-stat-label">Correct</div>
            </div>
            <div className="result-stat">
              <div className="result-stat-value">{result.total_questions}</div>
              <div className="result-stat-label">Questions</div>
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

  if (!questions) {
    return <div className="screen empty-state">Loading questions…</div>;
  }

  const q = questions[index];
  const accent = ACCENT[category] || "var(--accent)";

  return (
    <div className="screen">
      <div className="game-header">
        <div className="game-header-left">
          <span className="eyebrow">
            {category} · Q{index + 1}/{questions.length}
          </span>
          <span className={`timer-badge ${seconds <= 5 ? "low" : ""}`}>{seconds}s</span>
        </div>
        <QuitButton />
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${(index / questions.length) * 100}%`, background: accent }}
        />
      </div>

      <h2 className="question-text">{q.question_text}</h2>

      {q.options.map((opt, i) => (
        <button
          key={i}
          className={`option-btn ${selected === i ? "selected" : ""}`}
          onClick={() => {
            setSelected(i);
            setTimeout(() => goNext(i), 250);
          }}
          disabled={selected !== null}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
