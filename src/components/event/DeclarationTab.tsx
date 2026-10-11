import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  commitAsSignatory,
  getDeclaration,
  getMyDeclarant,
  listSignatories,
  saveDeclaration,
  withdrawSignatory,
} from "../../lib/api";
import { extractPostcode, suggestAuthority } from "../../lib/address";
import { daysUntil, declarationDeadline, declarationEarliest, declarationWindow } from "../../lib/declaration";
import { cityFromAddress, declarationChecklist } from "../../lib/declarationCheck";
import type { Declarant, EventRow, MemberRow } from "../../lib/types";

type Props = { event: EventRow; members: MemberRow[]; userId: string; canEdit: boolean };

function identityComplete(d: Declarant | null): boolean {
  return Boolean(d && d.first_name && d.last_name && d.address_line && d.postal_code && d.city);
}

export function DeclarationTab({ event, members, userId, canEdit }: Props) {
  const [signatories, setSignatories] = useState<string[]>([]);
  const [me, setMe] = useState<Declarant | null>(null);
  const [authority, setAuthority] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [banned, setBanned] = useState(false);
  const [banNotes, setBanNotes] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const postcode = extractPostcode(event.address);
  const suggestion = suggestAuthority(postcode, cityFromAddress(event.address));

  const load = useCallback(async () => {
    try {
      const [row, sigs, mine] = await Promise.all([
        getDeclaration(event.id),
        listSignatories(event.id),
        getMyDeclarant(userId),
      ]);
      setSignatories(sigs.map((s) => s.user_id));
      setMe(mine);
      if (row) {
        setAuthority(row.authority);
        setSubmittedAt(row.submitted_at ? row.submitted_at.slice(0, 10) : "");
        setReference(row.reference);
        setNotes(row.notes);
        setBanned(row.banned);
        setBanNotes(row.ban_notes);
      } else {
        setAuthority(suggestion);
      }
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    }
  }, [event.id, userId, suggestion]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    await run(async () => {
      await saveDeclaration(event.id, {
        authority: authority.trim(),
        submitted_at: submittedAt ? new Date(submittedAt).toISOString() : null,
        reference: reference.trim(),
        notes: notes.trim(),
        banned,
        ban_notes: banNotes.trim(),
      });
      setSaved(true);
    });
  }

  const start = new Date(event.starts_at);
  const deadline = declarationDeadline(start);
  const earliest = declarationEarliest(start);
  const windowState = declarationWindow(start, new Date());
  const left = daysUntil(deadline, new Date());
  const submitted = Boolean(submittedAt);
  const tone = submitted ? "notice-ok" : windowState === "depassee" ? "notice-error" : "notice-warn";
  const checklist = declarationChecklist(event, signatories.length);
  const ready = checklist.every((c) => c.ok);
  const iAmSignatory = signatories.includes(userId);
  const nameOf = (id: string) => {
    const m = members.find((x) => x.user_id === id);
    return m ? m.profiles.full_name || m.profiles.email : "Ancien membre";
  };

  if (!loaded) return <p className="muted">Chargement…</p>;

  return (
    <div className="stack">
      <div className={`notice ${tone}`}>
        {submitted ? (
          <>✓ Déclaration déposée{reference && ` (récépissé ${reference})`}.</>
        ) : windowState === "trop_tot" ? (
          <>
            Trop tôt pour déposer : à partir du <strong>{fmt(earliest)}</strong>, et au plus tard le <strong>{fmt(deadline)}</strong>.
          </>
        ) : windowState === "depassee" ? (
          <>La date limite ({fmt(deadline)}) est dépassée. Contactez sans attendre la mairie ou la préfecture.</>
        ) : (
          <>
            Vous pouvez déposer dès maintenant, au plus tard le <strong>{fmt(deadline)}</strong>
            {left === 0 ? " (aujourd'hui)" : ` (dans ${left} jour${left > 1 ? "s" : ""})`}.
          </>
        )}
        <div className="small">
          De 15 à 3 jours francs avant la manif (article L211-2 du Code de la sécurité intérieure).{" "}
          <Link to="/guide">Guide légal</Link>
        </div>
      </div>

      <section className="card flat">
        <h3>1. Ce que la déclaration doit contenir</h3>
        <ul className="steps">
          {checklist.map((c) => (
            <li key={c.label}>
              <Link to={`/evenements/${event.id}/${c.section}`} className={c.ok ? "step is-done" : "step"}>
                <span className="step-mark">{c.ok ? "✓" : ""}</span>
                <span className="step-label">{c.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="card flat">
        <h3>2. Organisateurs déclarants</h3>
        <p className="small muted">
          La déclaration indique les noms, prénoms et domiciles des organisateurs et doit être signée par au moins l'un
          d'eux. Chacun s'engage lui-même : personne ne peut déclarer à votre place.
        </p>
        {signatories.length === 0 && <p className="muted">Aucun déclarant pour l'instant.</p>}
        <ul className="list">
          {signatories.map((id) => (
            <li key={id} className="list-row">
              <strong>{nameOf(id)}</strong>
              {(id === userId || canEdit) && (
                <button className="btn btn-ghost" onClick={() => run(() => withdrawSignatory(event.id, id))}>
                  {id === userId ? "Me retirer" : "Retirer"}
                </button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && !iAmSignatory && (
          identityComplete(me) ? (
            <div className="stack">
              <p className="small">
                En vous engageant, vous acceptez que votre identité (nom, prénom, adresse, téléphone) figure sur la lettre
                et soit visible des organisateurs de cette manif. Vous serez responsable de l'exactitude de la déclaration.
              </p>
              <button className="btn btn-primary" onClick={() => run(() => commitAsSignatory(event.id, userId))}>
                Je m'engage comme déclarant
              </button>
            </div>
          ) : (
            <p className="notice notice-warn small">
              Pour vous engager comme déclarant, complétez d'abord votre identité dans <Link to="/profil">Mon profil</Link>.
            </p>
          )
        )}
        {!canEdit && <p className="small muted">Seuls les organisateurs peuvent être déclarants.</p>}
      </section>

      <section className="card flat">
        <h3>3. Générer la lettre</h3>
        {ready ? (
          <>
            <p className="small">Tout est prêt. La lettre reprend automatiquement les informations de la manif et des déclarants.</p>
            {canEdit && (
              <Link to={`/evenements/${event.id}/lettre`} className="btn btn-primary">
                Préparer la lettre de déclaration
              </Link>
            )}
          </>
        ) : (
          <p className="small muted">Complétez les éléments de l'étape 1 pour générer la lettre.</p>
        )}
      </section>

      <form onSubmit={save} className="card flat form">
        <h3>4. Dépôt et suivi</h3>
        <label>
          À qui l'adresser
          <input value={authority} onChange={(e) => setAuthority(e.target.value)} disabled={!canEdit} placeholder={suggestion || "Mairie de …"} />
          <span className="hint">
            À la mairie de la commune ; à Paris, à la préfecture de police ; dans les communes en police d'État, à la
            préfecture. Vérifiez si votre préfecture propose son propre formulaire.
          </span>
        </label>
        <div className="grid-2">
          <label>
            Date de dépôt
            <input type="date" value={submittedAt} onChange={(e) => setSubmittedAt(e.target.value)} disabled={!canEdit} />
          </label>
          <label>
            Numéro du récépissé
            <input value={reference} onChange={(e) => setReference(e.target.value)} disabled={!canEdit} />
          </label>
        </div>
        <label>
          Notes (échanges avec la mairie ou la préfecture, demandes de modification…)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} disabled={!canEdit} />
        </label>
        <label className="check">
          <input type="checkbox" checked={banned} onChange={(e) => setBanned(e.target.checked)} disabled={!canEdit} />
          <span>La manifestation a fait l'objet d'un arrêté d'interdiction</span>
        </label>
        {banned && (
          <div className="notice notice-error stack">
            <strong>En cas d'interdiction</strong>
            <ul className="small">
              <li>Prévenez immédiatement toute l'équipe et annulez l'appel à manifester, sauf décision contraire du juge.</li>
              <li>
                Une interdiction peut être contestée en urgence devant le tribunal administratif (référé-liberté). Contactez
                rapidement un avocat ou votre organisation.
              </li>
              <li>Organiser une manifestation interdite est un délit (article 431-9 du Code pénal) ; y participer est passible d'une amende.</li>
            </ul>
            <label>
              Notes sur l'interdiction (date, motif, recours)
              <textarea value={banNotes} onChange={(e) => setBanNotes(e.target.value)} rows={2} disabled={!canEdit} />
            </label>
          </div>
        )}
        {canEdit ? (
          <div className="row">
            <button className="btn btn-primary">Enregistrer</button>
            {saved && <span className="success">Enregistré.</span>}
          </div>
        ) : (
          <p className="muted small">Seuls les organisateurs peuvent modifier le suivi.</p>
        )}
      </form>

      {error && <p className="error">{error}</p>}
    </div>
  );
}

function fmt(d: Date): string {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}
