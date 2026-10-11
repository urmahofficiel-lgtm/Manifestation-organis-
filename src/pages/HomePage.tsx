import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LogoMark } from "../components/Logo";

const AUDIENCES = [
  { title: "Associations", text: "Coordonnez bénévoles et membres, de la préparation au jour J." },
  { title: "Syndicats", text: "Rassemblements, cortèges, service d'ordre : toute l'équipe au même endroit." },
  { title: "Collectifs", text: "Un espace commun pour un groupe informel, où chacun voit la même information." },
  { title: "Citoyens", text: "Première manif ? Suivez les étapes et les démarches pas à pas." },
];

const FEATURES = [
  { icon: "📍", title: "Lieu et carte", text: "Le point de rassemblement placé sur la carte, la date, l'heure." },
  { icon: "👥", title: "Équipe", text: "Invitez par lien, donnez des rôles : organisateur ou membre." },
  { icon: "✅", title: "Tâches", text: "Qui fait quoi, pour quand. On coche quand c'est fait." },
  { icon: "📦", title: "Matériel", text: "Banderoles, sono, gilets, eau : qui les garde et où." },
  { icon: "📣", title: "Slogans", text: "Proposez et validez les slogans du cortège." },
  { icon: "💬", title: "Discussion", text: "Un fil de discussion par manif, réservé à l'équipe." },
  { icon: "📝", title: "Démarches", text: "La période de déclaration calculée pour vous." },
  { icon: "🔗", title: "Page à partager", text: "Une affiche en ligne de votre manif à envoyer sur WhatsApp." },
];

export function HomePage() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/evenements" replace />;

  return (
    <div>
      <section className="hero-poster">
        <div className="row wrap">
          <LogoMark size={56} />
          <span className="badge">Gratuit · Pour associations, syndicats, collectifs et citoyens</span>
        </div>
        <h2 className="hero-title">
          Organisez. <mark>Mobilisez.</mark> Manifestez.
        </h2>
        <p className="hero-lead">
          Lieu, équipe, tâches, matériel, slogans, discussion et déclaration en mairie : toute votre manif au même
          endroit, sur téléphone comme sur ordinateur.
        </p>
        <div className="row wrap">
          <Link to="/connexion?mode=inscription" className="btn btn-yellow btn-lg">
            Créer mon compte
          </Link>
          <Link to="/connexion" className="btn btn-lg">
            J'ai déjà un compte
          </Link>
        </div>
      </section>

      <section className="section story card">
        <h2>Pourquoi « Agora » ?</h2>
        <p>
          Dans l'Athènes antique, l'<strong>agora</strong> était la grande place publique où les citoyens se réunissaient
          pour débattre, prendre la parole et décider ensemble. C'est là qu'est née l'idée de démocratie, avec deux
          principes : l'<strong>isègoria</strong>, le droit égal de chacun à parler devant l'assemblée, et la{" "}
          <strong>parrêsia</strong>, le courage de dire franchement ce que l'on pense.
        </p>
        <p>
          Vingt-cinq siècles plus tard, Agora est votre place publique pour préparer des rassemblements libres, déclarés et
          sûrs, où chacun peut faire entendre sa voix.
        </p>
      </section>

      <section className="section">
        <h2 className="section-title">Pour qui ?</h2>
        <div className="grid-cards">
          {AUDIENCES.map((a) => (
            <article key={a.title} className="card audience">
              <h3>{a.title}</h3>
              <p className="muted">{a.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Tout pour le jour J</h2>
        <div className="grid-cards">
          {FEATURES.map((f) => (
            <article key={f.title} className="card">
              <span className="feature-icon" aria-hidden>
                {f.icon}
              </span>
              <h3>{f.title}</h3>
              <p className="muted">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section cta-band">
        <h2>Dans les règles</h2>
        <p>
          En France, une manifestation sur la voie publique se déclare entre 15 et 3 jours francs avant. L'application
          calcule les dates pour vous.
        </p>
        <Link to="/guide" className="btn">
          Lire le guide légal
        </Link>
      </section>
    </div>
  );
}
