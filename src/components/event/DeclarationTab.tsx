import { useEffect, useState, type FormEvent } from "react";
import { getDeclaration, saveDeclaration } from "../../lib/api";
import { daysUntil, declarationDeadline } from "../../lib/declaration";
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
  const left = daysUntil(deadline, new Date());
  const submitted = Boolean(submittedAt);

  return (
    <div className="stack">
      <div className={`notice ${submitted ? "notice-ok" : left < 0 ? "notice-error" : "notice-warn"}`}>
        {submitted ? (
          <>Déclaration déposée{reference && ` (réf. ${reference})`}.</>
        ) : left < 0 ? (
          <>La date limite de déclaration ({fmt(deadline)}) est dépassée.</>
        ) : (
          <>
            Date limite de déclaration : <strong>{fmt(deadline)}</strong>
            {left === 0 ? " (aujourd'hui)" : ` (dans ${left} jour${left > 1 ? "s" : ""})`}.
          </>
        )}
        <div className="small">
          Calcul indicatif : au moins trois jours francs avant la manifestation (article L211-1 du Code de la
          sécurité intérieure). Vérifiez auprès de la préfecture compétente.
        </div>
      </div>

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
