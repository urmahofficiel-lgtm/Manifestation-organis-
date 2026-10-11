import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./lib/auth";
import { isSupabaseConfigured } from "./lib/supabase";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { GuidePage } from "./pages/GuidePage";
import { LoginPage } from "./pages/LoginPage";
import { InvitePage } from "./pages/InvitePage";
import { DashboardPage } from "./pages/DashboardPage";
import { NewEventPage } from "./pages/NewEventPage";
import { PublicEventPage } from "./pages/PublicEventPage";
import { ProfilePage } from "./pages/ProfilePage";
import { LetterPage } from "./pages/LetterPage";
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
        <Route path="/e/:id" element={<PublicEventPage />} />
        <Route
          path="/evenements"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/evenements/nouveau"
          element={
            <RequireAuth>
              <NewEventPage />
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
        <Route
          path="/profil"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/evenements/:id/lettre"
          element={
            <RequireAuth>
              <LetterPage />
            </RequireAuth>
          }
        />
        <Route
          path="/evenements/:id/:section"
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
