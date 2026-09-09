import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Arena from "./pages/Arena.jsx";
import ClassicQuiz from "./pages/ClassicQuiz.jsx";
import FlashAnzan from "./pages/FlashAnzan.jsx";
import FlagGuess from "./pages/FlagGuess.jsx";
import DuelRoom from "./pages/DuelRoom.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import Profile from "./pages/Profile.jsx";
import PeopleList from "./pages/PeopleList.jsx";

function Protected({ children }) {
  const { isAuthed, isChecking } = useAuth();
  if (isChecking) {
    return <div className="screen empty-state">Loading…</div>;
  }
  return isAuthed ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { isAuthed } = useAuth();

  return (
    <div className={`app-shell ${isAuthed ? "with-sidebar" : "auth-shell"}`}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/arena"
          element={
            <Protected>
              <Arena />
            </Protected>
          }
        />
        <Route
          path="/quiz/:category"
          element={
            <Protected>
              <ClassicQuiz />
            </Protected>
          }
        />
        <Route
          path="/flash-anzan"
          element={
            <Protected>
              <FlashAnzan />
            </Protected>
          }
        />
        <Route
          path="/flag-guess"
          element={
            <Protected>
              <FlagGuess />
            </Protected>
          }
        />
        <Route
          path="/duel/:category"
          element={
            <Protected>
              <DuelRoom />
            </Protected>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <Protected>
              <Leaderboard />
            </Protected>
          }
        />
        <Route
          path="/profile"
          element={
            <Protected>
              <Profile />
            </Protected>
          }
        />
        <Route
          path="/players"
          element={
            <Protected>
              <PeopleList />
            </Protected>
          }
        />
        <Route
          path="/players/:username/:kind"
          element={
            <Protected>
              <PeopleList />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/arena" replace />} />
      </Routes>
    </div>
  );
}
