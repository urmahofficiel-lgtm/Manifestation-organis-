import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LogoMark } from "../components/Logo";

const AUDIENCES = [
  { title: "Associations", text: "Coordonnez vos bénévoles, vos membres et vos actions, de la préparation au jour J." },
  { title: "Syndicats", text: "Préparez vos rassemblements, vos cortèges et vos services d'ordre avec toute l'équipe." },
  { title: "Collectifs", text: "Un espace commun pour un groupe informel : tout le monde voit la même information." },
  { title: "Citoyens", text: "Vous organisez pour la première fois ? Suivez les étapes et les démarches pas à pas." },
];

const FEATURES = [
  { title: "Événements et carte", text: "Date, lieu, point de rassemblement placé sur la carte, nombre de participants attendus." },
  { title: "Équipe et invitations", text: "Invitez par lien ou par e-mail, attribuez des rôles : propriétaire, organisateur, membre." },
  { title: "Tâches", text: "Qui fait quoi, pour quand, avec une case à cocher quand c'est fait." },
  { title: "Matériel", text: "Banderoles, sono, gilets, eau : combien, qui les garde, où ils sont." },
  { title: "Slogans", text: "Proposez, validez et gardez les slogans de la mobilisation, avec des idées pour démarrer." },
  { title: "Discussion d'équipe", text: "Un fil de discussion par événement, réservé aux membres." },
  { title: "Annonces", text: "Les consignes importantes visibles de tous : rendez-vous, changements d'horaire." },
  { title: "Démarches", text: "Suivi de la déclaration, avec la période de dépôt calculée pour vous." },
];

export function HomePage() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/evenements" replace />;

  return (
    <div className="home">
      <section className="hero">
        <LogoMark size={64} />
        <h1>Organisez vos manifestations ensemble, au même endroit</h1>
        <p className="lead">
          Événements, équipe, tâches, matériel, slogans, discussion et démarches : tout ce qu'il faut pour
          préparer un rassemblement, sans jongler entre dix outils.
        </p>
        <div className="row center wrap">
          <Link to="/connexion?mode=inscription" className="btn btn-primary btn-lg">
            Créer un compte gratuit
          </Link>
          <Link to="/connexion" className="btn btn-lg">
            Se connecter
          </Link>
        </div>
      </section>

      <section>
        <h2>Pour qui ?</h2>
        <div className="grid-cards">
          {AUDIENCES.map((a) => (
            <article key={a.title} className="card">
              <h3>{a.title}</h3>
              <p className="muted">{a.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Tout pour préparer le jour J</h2>
        <div className="grid-cards">
          {FEATURES.map((f) => (
            <article key={f.title} className="card">
              <h3>{f.title}</h3>
              <p className="muted">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card notice notice-warn">
        <h2>Respecter la loi</h2>
        <p>
          En France, une manifestation sur la voie publique doit être déclarée en amont, entre quinze et trois jours
          francs avant sa tenue. L'application calcule la période pour vous et vous guide pas à pas.
        </p>
        <Link to="/guide">Lire le guide légal</Link>
      </section>
    </div>
  );
}
