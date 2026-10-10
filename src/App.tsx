import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./lib/auth";
import { isSupabaseConfigured } from "./lib/supabase";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { EventsPage } from "./pages/EventsPage";
import { EventPage } from "./pages/EventPage";
import { SetupPage } from "./pages/SetupPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="centered">Chargement…</p>;
  if (!user) return <Navigate to="/connexion" replace />;
  return <>{children}</>;
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupPage />;

  return (
    <Layout>
      <Routes>
        <Route path="/connexion" element={<LoginPage />} />
        <Route
          path="/"
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
