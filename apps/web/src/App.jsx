import { Routes, Route, Navigate, useParams } from "react-router-dom";
import SessionMode from "./pages/SessionMode";
import AdminPersonas from "./pages/AdminPersonas";
import Home from "./pages/Home";
import Matters from "./pages/Matters";
import Explore from "./pages/Explore";
import Player from "./pages/Player";
import { useAuth } from "./auth";
import { getAdminPersonaPicked } from "./persona";

function LegacyPersonaYears() {
  return <Navigate to="/y" replace />;
}

function LegacyPersonaMatters() {
  const { yearCode } = useParams();
  return <Navigate to={`/y/${encodeURIComponent(yearCode)}`} replace />;
}

/** Admin must pick persona before tutor mode */
function SessionGate() {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (isAdmin && !getAdminPersonaPicked()) {
    return <Navigate to="/admin" replace />;
  }
  return <SessionMode />;
}

export default function App() {
  return (
    <Routes>
      {/* Admin: persona + stats → tutor → years → matter → explore → play */}
      <Route path="/admin" element={<AdminPersonas />} />
      <Route path="/" element={<SessionGate />} />
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
