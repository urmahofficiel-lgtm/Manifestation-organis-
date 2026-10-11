import { useEffect, useState, type FormEvent } from "react";
import { getDeclaration, saveDeclaration } from "../../lib/api";
import { Link } from "react-router-dom";
import { daysUntil, declarationDeadline, declarationEarliest, declarationWindow } from "../../lib/declaration";
import type { DeclarationRow, EventRow } from "../../lib/types";

type Props = { eventId: string; event: EventRow; canEdit: boolean };

export function DeclarationTab({ eventId, event, canEdit }: Props) {
  const [authority, setAuthority] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDeclaration(eventId)
      .then((row: DeclarationRow | null) => {
        if (row) {
          setAuthority(row.authority);
          setSubmittedAt(row.submitted_at ? row.submitted_at.slice(0, 10) : "");
          setReference(row.reference);
          setNotes(row.notes);
        }
        setLoaded(true);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Chargement impossible."));
  }, [eventId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await saveDeclaration(eventId, {
        authority: authority.trim(),
        submitted_at: submittedAt ? new Date(submittedAt).toISOString() : null,
        reference: reference.trim(),
        notes: notes.trim(),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
  }

  const start = new Date(event.starts_at);
  const deadline = declarationDeadline(start);
  const earliest = declarationEarliest(start);
  const windowState = declarationWindow(start, new Date());
  const left = daysUntil(deadline, new Date());
  const submitted = Boolean(submittedAt);
  const tone = submitted ? "notice-ok" : windowState === "depassee" ? "notice-error" : "notice-warn";

  return (
    <div className="stack">
      <div className={`notice ${tone}`}>
        {submitted ? (
          <>Déclaration déposée{reference && ` (récépissé ${reference})`}.</>
        ) : windowState === "trop_tot" ? (
          <>
            Trop tôt pour déclarer : le dépôt est possible à partir du <strong>{fmt(earliest)}</strong> (15 jours
            francs avant), et au plus tard le <strong>{fmt(deadline)}</strong>.
          </>
        ) : windowState === "depassee" ? (
          <>La date limite de déclaration ({fmt(deadline)}) est dépassée. Contactez sans attendre votre mairie ou votre préfecture.</>
        ) : (
          <>
            Vous pouvez déclarer dès maintenant, au plus tard le <strong>{fmt(deadline)}</strong>
            {left === 0 ? " (aujourd'hui)" : ` (dans ${left} jour${left > 1 ? "s" : ""})`}.
          </>
        )}
        <div className="small">
          Période indicative : de 15 jours francs à 3 jours francs avant la manifestation (article L211-2 du Code de la
          sécurité intérieure). Vérifiez auprès de la mairie ou de la préfecture compétente.{" "}
          <Link to="/guide">Lire le guide légal</Link>
        </div>
      </div>

      <section className="card">
        <h3>À préparer pour la déclaration</h3>
        <ul>
          <li>Noms, prénoms et domiciles des organisateurs</li>
          <li>Signature d'au moins l'un des organisateurs</li>
          <li>But de la manifestation, lieu, date et heure du rassemblement</li>
          <li>Itinéraire prévu, le cas échéant</li>
          <li>À déposer à la mairie (préfecture de police à Paris, préfecture dans les communes en police d'État)</li>
          <li>Demander le récépissé et le noter ci-dessous</li>
        </ul>
      </section>

      {!loaded ? (
        <p className="muted">Chargement…</p>
      ) : (
        <form onSubmit={save} className="form">
          <label>
            Préfecture ou sous-préfecture
            <input value={authority} onChange={(e) => setAuthority(e.target.value)} disabled={!canEdit} />
          </label>
          <div className="grid-2">
            <label>
              Date de dépôt
              <input type="date" value={submittedAt} onChange={(e) => setSubmittedAt(e.target.value)} disabled={!canEdit} />
            </label>
            <label>
              Numéro de récépissé
              <input value={reference} onChange={(e) => setReference(e.target.value)} disabled={!canEdit} />
            </label>
          </div>
          <label>
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} disabled={!canEdit} />
          </label>
          {canEdit ? (
            <div className="row">
              <button className="btn btn-primary">Enregistrer</button>
              {saved && <span className="success">Enregistré.</span>}
            </div>
          ) : (
            <p className="muted small">Seuls les organisateurs peuvent modifier les démarches.</p>
          )}
          {error && <p className="error">{error}</p>}
        </form>
      )}
    </div>
  );
}

function fmt(d: Date): string {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
