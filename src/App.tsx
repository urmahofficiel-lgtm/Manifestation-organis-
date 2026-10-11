import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./lib/auth";
import { isSupabaseConfigured } from "./lib/supabase";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { GuidePage } from "./pages/GuidePage";
import { LoginPage } from "./pages/LoginPage";
import { InvitePage } from "./pages/InvitePage";
import { EventsPage } from "./pages/EventsPage";
import { EventPage } from "./pages/EventPage";
import { SetupPage } from "./pages/SetupPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="centered">Chargement…</p>;
  if (!user) {
    return <Navigate to={`/connexion?suite=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupPage />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/invitation/:code" element={<InvitePage />} />
        <Route
          path="/evenements"
          element={
            <RequireAuth>
              <EventsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/evenements/:id"
          element={
            <RequireAuth>
              <EventPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
