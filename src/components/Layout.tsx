import { Link, NavLink, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../lib/auth";
import { Logo } from "./Logo";

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  // La page publique d'un événement s'affiche sans le menu de l'application.
  const isPublicPage = location.pathname.startsWith("/e/");

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Accueil">
          <Logo />
        </Link>
        <nav className="topbar-actions" aria-label="Navigation principale">
          {user ? (
            <>
              <NavLink to="/evenements" end className="navlink desktop-only">
                Mes manifs
              </NavLink>
              <NavLink to="/evenements/nouveau" className="navlink desktop-only">
                + Créer
              </NavLink>
              <NavLink to="/guide" className="navlink desktop-only">
                Guide légal
              </NavLink>
              <NavLink to="/profil" className="navlink desktop-only">
                Profil
              </NavLink>
              <button className="btn btn-ghost desktop-only" onClick={() => signOut()}>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <NavLink to="/guide" className="navlink">
                Guide légal
              </NavLink>
              <Link to="/connexion" className="btn btn-yellow">
                Se connecter
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="container">{children}</main>

      {!isPublicPage && (
        <footer className="footer">
          <p className="muted small">
            Manifestation Organiser est un outil d'organisation. Il ne remplace ni un conseil juridique ni les
            démarches officielles. <Link to="/guide">Guide légal</Link>
          </p>
        </footer>
      )}

      {user && !isPublicPage && (
        <nav className="bottom-nav" aria-label="Navigation mobile">
          <NavLink to="/evenements" end>
            <span className="nav-icon" aria-hidden>
              🏠
            </span>
            Mes manifs
          </NavLink>
          <NavLink to="/guide">
            <span className="nav-icon" aria-hidden>
              ⚖️
            </span>
            Guide
          </NavLink>
          <NavLink to="/evenements/nouveau" className="create" aria-label="Créer un événement">
            +
          </NavLink>
          <NavLink to="/profil">
            <span className="nav-icon" aria-hidden>
              👤
            </span>
            Profil
          </NavLink>
        </nav>
      )}
    </div>
  );
}
