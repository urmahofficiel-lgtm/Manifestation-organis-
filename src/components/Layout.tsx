import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../lib/auth";
import { Logo } from "./Logo";

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Accueil">
          <Logo />
        </Link>
        <nav className="topbar-actions">
          <NavLink to="/guide" className="navlink">
            Guide légal
          </NavLink>
          {user ? (
            <>
              <NavLink to="/evenements" className="navlink">
                Mes événements
              </NavLink>
              <button className="btn btn-ghost" onClick={() => signOut()}>
                Se déconnecter
              </button>
            </>
          ) : (
            <Link to="/connexion" className="btn btn-primary">
              Se connecter
            </Link>
          )}
        </nav>
      </header>
      <main className="container">{children}</main>
      <footer className="footer">
        <p className="muted small">
          Manifestation Organiser est un outil d'organisation. Il ne remplace ni un conseil juridique ni les
          démarches officielles. <Link to="/guide">Voir le guide légal</Link>
        </p>
      </footer>
    </div>
  );
}
