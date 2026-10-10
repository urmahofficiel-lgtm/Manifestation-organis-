import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../lib/auth";

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          Manifestation Organiser
        </Link>
        {user && (
          <nav className="topbar-actions">
            <span className="muted small">{user.email}</span>
            <button className="btn btn-ghost" onClick={() => signOut()}>
              Se déconnecter
            </button>
          </nav>
        )}
      </header>
      <main className="container">{children}</main>
    </div>
  );
}
