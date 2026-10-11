import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { joinByCode, previewInvite } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { InvitePreview } from "../lib/types";

export function InvitePage() {
  const { code = "" } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<InvitePreview | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    previewInvite(code)
      .then(setPreview)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Invitation introuvable."));
  }, [code, user]);

  if (loading) return <p className="centered">Chargement…</p>;

  const suite = encodeURIComponent(`/invitation/${code}`);
  if (!user) {
    return (
      <div className="card narrow">
        <h1>Invitation à un événement</h1>
        <p>Connectez-vous ou créez un compte pour rejoindre l'équipe.</p>
        <div className="row wrap">
          <Link to={`/connexion?suite=${suite}`} className="btn btn-primary">
            Se connecter
          </Link>
          <Link to={`/connexion?mode=inscription&suite=${suite}`} className="btn">
            Créer un compte
          </Link>
        </div>
      </div>
    );
  }

  async function join() {
    setError(null);
    setBusy(true);
    try {
      const eventId = await joinByCode(code);
      navigate(`/evenements/${eventId}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de rejoindre l'événement.");
      setBusy(false);
    }
  }

  return (
    <div className="card narrow">
      <h1>Invitation à un événement</h1>
      {preview === undefined && !error && <p className="muted">Vérification de l'invitation…</p>}
      {preview === null && <p className="error">Cette invitation est invalide, expirée ou déjà utilisée.</p>}
      {preview && (
        <>
          <p>
            Vous êtes invité à rejoindre l'équipe de <strong>{preview.event_title}</strong>
            {preview.organizer_name && <> organisé par {preview.organizer_name}</>}.
          </p>
          <p className="muted small">
            {new Date(preview.starts_at).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
          </p>
          <button className="btn btn-primary" onClick={join} disabled={busy}>
            Rejoindre l'événement
          </button>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
