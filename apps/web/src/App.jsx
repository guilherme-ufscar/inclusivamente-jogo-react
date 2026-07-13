import { Routes, Route, Navigate, useParams } from "react-router-dom";
import SessionMode from "./pages/SessionMode";
import Home from "./pages/Home";
import Matters from "./pages/Matters";
import Explore from "./pages/Explore";
import Player from "./pages/Player";

function LegacyPersonaYears() {
  return <Navigate to="/y" replace />;
}

function LegacyPersonaMatters() {
  const { yearCode } = useParams();
  return <Navigate to={`/y/${encodeURIComponent(yearCode)}`} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Tutor mode first → years → matter → explore → play */}
      <Route path="/" element={<SessionMode />} />
      <Route path="/y" element={<Home />} />
      <Route path="/y/:yearCode" element={<Matters />} />
      <Route path="/y/:yearCode/m/:matterId" element={<Explore />} />
      <Route path="/play/:activityId" element={<Player />} />

      {/* Legacy */}
      <Route path="/p/:slug" element={<LegacyPersonaYears />} />
      <Route path="/p/:slug/y/:yearCode" element={<LegacyPersonaMatters />} />
      <Route path="/matter/:matterId" element={<Navigate to="/" replace />} />
      <Route path="/pill/:pillId" element={<Navigate to="/" replace />} />
      <Route path="/level/:levelId" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
