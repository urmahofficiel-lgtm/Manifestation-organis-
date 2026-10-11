import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  commitAsSignatory,
  deleteDeclarationDocument,
  downloadDocument,
  getDeclaration,
  getDocumentUrl,
  getMyDeclarant,
  listDeclarationDocuments,
  listSignatories,
  saveDeclaration,
  updateEvent,
  uploadDeclarationDocument,
  withdrawSignatory,
} from "../../lib/api";
import { communeFromPoint, communeFromText, findAuthorities, type AuthorityContact, type Commune } from "../../lib/annuaire";
import { daysUntil, declarationDeadline, declarationEarliest, declarationWindow } from "../../lib/declaration";
import { declarationChecklist } from "../../lib/declarationCheck";
import type { Declarant, DeclarationDocument, DeclarationRow, EventRow, MemberRow, SentVia } from "../../lib/types";

type Props = { event: EventRow; members: MemberRow[]; userId: string; canEdit: boolean };

const SENT_VIA: { id: SentVia; label: string }[] = [
  { id: "email", label: "Par e-mail" },
  { id: "formulaire", label: "Par le formulaire en ligne de la mairie ou de la préfecture" },
  { id: "main", label: "Déposée en main propre" },
  { id: "courrier", label: "Par courrier" },
];

const KIND_LABEL: Record<AuthorityContact["kind"], string> = {
  mairie: "Mairie",
  prefecture: "Préfecture",
  prefecture_police: "Préfecture de police",
};

function identityComplete(d: Declarant | null): boolean {
  return Boolean(d && d.first_name && d.last_name && d.address_line && d.postal_code && d.city);
}

export function DeclarationTab({ event, members, userId, canEdit }: Props) {
  const [signatories, setSignatories] = useState<string[]>([]);
  const [me, setMe] = useState<Declarant | null>(null);
  const [decl, setDecl] = useState<DeclarationRow | null>(null);
  const [docs, setDocs] = useState<DeclarationDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [row, sigs, mine, documents] = await Promise.all([
        getDeclaration(event.id),
        listSignatories(event.id),
        getMyDeclarant(userId),
        canEdit ? listDeclarationDocuments(event.id) : Promise.resolve([]),
      ]);
      setDecl(row);
      setSignatories(sigs.map((s) => s.user_id));
      setMe(mine);
      setDocs(documents);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    }
  }, [event.id, userId, canEdit]);

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

  const start = new Date(event.starts_at);
  const deadline = declarationDeadline(start);
  const earliest = declarationEarliest(start);
  const windowState = declarationWindow(start, new Date());
  const left = daysUntil(deadline, new Date());
  const checklist = declarationChecklist(event, signatories.length);
  const ready = checklist.every((c) => c.ok);
  const iAmSignatory = signatories.includes(userId);
  const letters = docs.filter((d) => d.kind === "lettre");
  const receipts = docs.filter((d) => d.kind === "recepisse");
  const sent = Boolean(decl?.sent_at || decl?.submitted_at);
  const hasReceipt = Boolean(decl?.reference || receipts.length);
  const nameOf = (id: string) => {
    const m = members.find((x) => x.user_id === id);
    return m ? m.profiles.full_name || m.profiles.email : "Ancien membre";
  };

  if (!loaded) return <p className="muted">Chargement…</p>;

  return (
    <div className="stack">
      <div className={`notice ${hasReceipt ? "notice-ok" : windowState === "depassee" && !sent ? "notice-error" : "notice-warn"}`}>
        {hasReceipt ? (
          <>✓ Déclaration déposée et récépissé reçu{decl?.reference && ` (n° ${decl.reference})`}.</>
        ) : sent ? (
          <>Déclaration envoyée. En attente du récépissé.</>
        ) : windowState === "trop_tot" ? (
          <>
            Trop tôt pour déposer : à partir du <strong>{fmt(earliest)}</strong>, au plus tard le <strong>{fmt(deadline)}</strong>.
          </>
        ) : windowState === "depassee" ? (
          <>La date limite ({fmt(deadline)}) est dépassée. Contactez sans attendre la mairie ou la préfecture.</>
        ) : (
          <>
            À déposer au plus tard le <strong>{fmt(deadline)}</strong>
            {left === 0 ? " (aujourd'hui)" : ` (dans ${left} jour${left > 1 ? "s" : ""})`}.
          </>
        )}
        <div className="small">
          De 15 à 3 jours francs avant la manif (article L211-2 du Code de la sécurité intérieure). <Link to="/guide">Guide légal</Link>
        </div>
      </div>

      <ol className="timeline-steps" aria-label="Avancement de la déclaration">
        <li className={ready ? "is-done" : ""}>Prête</li>
        <li className={letters.length ? "is-done" : ""}>Lettre PDF</li>
        <li className={sent ? "is-done" : ""}>Envoyée</li>
        <li className={hasReceipt ? "is-done" : ""}>Récépissé</li>
      </ol>

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
        {canEdit &&
          !iAmSignatory &&
          (identityComplete(me) ? (
            <div className="stack">
              <p className="small">
                En vous engageant, vous acceptez que votre identité (nom, prénom, adresse, téléphone) figure sur la lettre et
                soit visible des organisateurs de cette manif. Vous êtes responsable de l'exactitude de la déclaration.
              </p>
              <button className="btn btn-primary" onClick={() => run(() => commitAsSignatory(event.id, userId))}>
                Je m'engage comme déclarant
              </button>
            </div>
          ) : (
            <p className="notice notice-warn small">
              Pour vous engager comme déclarant, complétez d'abord votre identité dans <Link to="/profil">Mon profil</Link>.
            </p>
          ))}
        {!canEdit && <p className="small muted">Seuls les organisateurs peuvent être déclarants et voir le dossier.</p>}
      </section>

      {canEdit && (
        <>
          <AuthorityStep event={event} decl={decl} onSaved={load} onError={setError} />

          <section className="card flat">
            <h3>4. La lettre de déclaration (PDF)</h3>
            {ready ? (
              <>
                <p className="small">
                  La lettre reprend automatiquement la manif et les déclarants. Créez le PDF : il est téléchargé et archivé
                  ici.
                </p>
                <Link to={`/evenements/${event.id}/lettre`} className="btn btn-primary">
                  {letters.length ? "Refaire la lettre" : "Préparer la lettre"}
                </Link>
              </>
            ) : (
              <p className="small muted">Complétez les étapes 1 et 2 pour préparer la lettre.</p>
            )}
            <DocumentList docs={letters} onDelete={(d) => run(() => deleteDeclarationDocument(d))} />
          </section>

          <SendStep event={event} decl={decl} me={me} letter={letters[0] ?? null} onSaved={load} onError={setError} />

          <ReceiptStep event={event} decl={decl} receipts={receipts} userId={userId} onSaved={load} onError={setError} onDelete={(d) => run(() => deleteDeclarationDocument(d))} />
        </>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}

// Étape 3 : retrouver le destinataire officiel dans l'annuaire de l'administration
function AuthorityStep({
  event,
  decl,
  onSaved,
  onError,
}: {
  event: EventRow;
  decl: DeclarationRow | null;
  onSaved: () => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [commune, setCommune] = useState<Commune | null>(null);
  const [authorities, setAuthorities] = useState<AuthorityContact[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [manual, setManual] = useState({ name: decl?.authority ?? "", email: decl?.authority_email ?? "" });

  useEffect(() => {
    let cancelled = false;
    async function lookup() {
      setSearching(true);
      try {
        const c =
          event.lat !== null && event.lng !== null
            ? await communeFromPoint(event.lat, event.lng)
            : await communeFromText(event.address || event.place_name);
        if (cancelled) return;
        setCommune(c);
        setAuthorities(c ? await findAuthorities(c) : []);
      } catch {
        if (!cancelled) setAuthorities([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }
    lookup();
    return () => {
      cancelled = true;
    };
  }, [event.lat, event.lng, event.address, event.place_name]);

  async function choose(a: AuthorityContact) {
    onError(null);
    try {
      await saveDeclaration(event.id, { authority: a.name, authority_email: a.email, authority_details: a as unknown as Record<string, unknown> });
      setManual({ name: a.name, email: a.email });
      await onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
  }

  async function saveManual(e: FormEvent) {
    e.preventDefault();
    onError(null);
    try {
      await saveDeclaration(event.id, { authority: manual.name.trim(), authority_email: manual.email.trim() });
      await onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
  }

  return (
    <section className="card flat stack">
      <h3>3. À qui envoyer la déclaration</h3>
      <p className="small muted">
        Recherche automatique dans l'annuaire officiel de l'administration (Service-Public.fr), d'après le lieu de la manif.
        En règle générale, c'est la <strong>mairie</strong>. À Paris, c'est la <strong>préfecture de police</strong>. Dans
        les communes où la police est d'État (souvent les grandes villes), c'est la <strong>préfecture</strong> : en cas de
        doute, appelez la mairie.
      </p>
      {searching && <p className="muted">Recherche dans l'annuaire officiel…</p>}
      {!searching && commune && <p className="small">Commune trouvée : <strong>{commune.name}</strong></p>}
      {!searching && authorities?.length === 0 && (
        <p className="small muted">Aucun résultat automatique. Placez le point de rassemblement sur la carte, ou saisissez le destinataire ci-dessous.</p>
      )}
      <div className="grid-2">
        {authorities?.map((a) => {
          const chosen = decl?.authority === a.name;
          return (
            <article key={a.name} className={chosen ? "authority chosen" : "authority"}>
              <span className="badge">{KIND_LABEL[a.kind]}</span>
              <strong>{a.name}</strong>
              {a.email ? <span className="small">✉️ {a.email}</span> : <span className="small muted">Pas d'e-mail publié</span>}
              {a.phone && <a className="small" href={`tel:${a.phone.replace(/\s/g, "")}`}>📞 {a.phone}</a>}
              {a.address && <span className="small muted">📮 {a.address}</span>}
              {a.contactForm && (
                <a className="small" href={a.contactForm} target="_blank" rel="noreferrer">
                  Formulaire de contact
                </a>
              )}
              {a.servicePublicUrl && (
                <a className="small" href={a.servicePublicUrl} target="_blank" rel="noreferrer">
                  Fiche officielle Service-Public.fr
                </a>
              )}
              <button className={chosen ? "btn" : "btn btn-primary"} onClick={() => choose(a)} disabled={chosen}>
                {chosen ? "✓ Destinataire choisi" : "Choisir ce destinataire"}
              </button>
            </article>
          );
        })}
      </div>
      <form onSubmit={saveManual} className="form">
        <div className="grid-2">
          <label>
            Destinataire
            <input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="Mairie de …" />
          </label>
          <label>
            E-mail du destinataire
            <input type="email" value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} />
          </label>
        </div>
        <div>
          <button className="btn">Enregistrer le destinataire</button>
        </div>
      </form>
    </section>
  );
}

// Étape 5 : envoyer avec sa propre messagerie (gratuit), puis noter l'envoi
function SendStep({
  event,
  decl,
  me,
  letter,
  onSaved,
  onError,
}: {
  event: EventRow;
  decl: DeclarationRow | null;
  me: Declarant | null;
  letter: DeclarationDocument | null;
  onSaved: () => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [via, setVia] = useState<SentVia>("email");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sharing, setSharing] = useState(false);
  const details = (decl?.authority_details ?? {}) as Partial<AuthorityContact>;
  const email = decl?.authority_email ?? "";
  const when = new Date(event.starts_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const subject = `Déclaration de manifestation sur la voie publique : ${event.title} (${new Date(event.starts_at).toLocaleDateString("fr-FR")})`;
  const signature = me ? `${me.first_name} ${me.last_name.toUpperCase()}${me.phone ? `\n${me.phone}` : ""}` : "";
  const body = [
    "Madame, Monsieur,",
    "",
    `Veuillez trouver ci-joint la déclaration préalable de la manifestation « ${event.title} » prévue le ${when}${event.place_name ? `, ${event.place_name}` : ""}, conformément à l'article L211-2 du Code de la sécurité intérieure.`,
    "",
    "Je vous remercie de bien vouloir m'adresser le récépissé en retour.",
    "",
    "Cordialement,",
    signature,
  ].join("\n");
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const canShareFiles = typeof navigator !== "undefined" && "canShare" in navigator;

  async function share() {
    if (!letter) return;
    setSharing(true);
    onError(null);
    try {
      const blob = await downloadDocument(letter.path);
      const file = new File([blob], letter.file_name || "declaration.pdf", { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: subject, text: body });
      } else {
        window.open(await getDocumentUrl(letter.path), "_blank");
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        onError(err instanceof Error ? err.message : "Partage impossible.");
      }
    } finally {
      setSharing(false);
    }
  }

  async function markSent(e: FormEvent) {
    e.preventDefault();
    onError(null);
    try {
      const at = new Date(date).toISOString();
      await saveDeclaration(event.id, { sent_at: at, sent_via: via, submitted_at: at });
      await onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
  }

  return (
    <section className="card flat stack">
      <h3>5. Envoyer la déclaration</h3>
      {!letter ? (
        <p className="small muted">Créez d'abord la lettre PDF (étape 4).</p>
      ) : (
        <>
          <p className="small">
            L'envoi se fait <strong>depuis votre propre messagerie</strong> : c'est gratuit et la mairie vous répond
            directement. Joignez le PDF de la déclaration.
          </p>
          <div className="share">
            {email && (
              <a className="btn btn-primary" href={mailto}>
                ✉️ Écrire à {decl?.authority || "la mairie"}
              </a>
            )}
            {canShareFiles && (
              <button className="btn btn-yellow" onClick={share} disabled={sharing}>
                📎 Partager le PDF (e-mail, messagerie…)
              </button>
            )}
            <button className="btn" onClick={async () => window.open(await getDocumentUrl(letter.path), "_blank")}>
              Ouvrir le PDF
            </button>
            {details.contactForm && (
              <a className="btn" href={details.contactForm} target="_blank" rel="noreferrer">
                Formulaire en ligne
              </a>
            )}
            {details.phone && (
              <a className="btn" href={`tel:${details.phone.replace(/\s/g, "")}`}>
                📞 {details.phone}
              </a>
            )}
          </div>
          {!email && (
            <p className="small muted">
              Pas d'e-mail connu pour ce destinataire : utilisez son formulaire en ligne, déposez la lettre en main propre
              (le récépissé est remis tout de suite) ou envoyez-la par courrier{details.address ? ` à : ${details.address}` : ""}.
            </p>
          )}
          <p className="small muted">
            Toutes les mairies n'acceptent pas l'e-mail : si vous n'avez pas de réponse sous 24 heures, appelez-les ou déposez
            la lettre sur place.
          </p>
        </>
      )}
      <form onSubmit={markSent} className="form">
        <h4>Noter l'envoi</h4>
        <div className="grid-2">
          <select value={via} onChange={(e) => setVia(e.target.value as SentVia)} aria-label="Mode d'envoi">
            {SENT_VIA.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date d'envoi" />
        </div>
        <div className="row wrap">
          <button className="btn btn-primary">J'ai envoyé la déclaration</button>
          {decl?.sent_at && (
            <span className="success small">
              ✓ Envoyée le {new Date(decl.sent_at).toLocaleDateString("fr-FR")} ({SENT_VIA.find((v) => v.id === decl.sent_via)?.label.toLowerCase()})
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

// Étape 6 : récépissé, numéro, notes, interdiction éventuelle
function ReceiptStep({
  event,
  decl,
  receipts,
  userId,
  onSaved,
  onError,
  onDelete,
}: {
  event: EventRow;
  decl: DeclarationRow | null;
  receipts: DeclarationDocument[];
  userId: string;
  onSaved: () => Promise<void>;
  onError: (msg: string | null) => void;
  onDelete: (d: DeclarationDocument) => void;
}) {
  const [reference, setReference] = useState(decl?.reference ?? "");
  const [notes, setNotes] = useState(decl?.notes ?? "");
  const [banned, setBanned] = useState(decl?.banned ?? false);
  const [banNotes, setBanNotes] = useState(decl?.ban_notes ?? "");
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function markDeclared() {
    if (event.status === "brouillon" || event.status === "a_declarer") await updateEvent(event.id, { status: "declare" });
  }

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      onError("Fichier trop lourd (10 Mo maximum).");
      return;
    }
    setUploading(true);
    onError(null);
    try {
      await uploadDeclarationDocument(event.id, "recepisse", file, file.name, userId);
      await markDeclared();
      await onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Envoi du fichier impossible.");
    } finally {
      setUploading(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    onError(null);
    setSaved(false);
    try {
      await saveDeclaration(event.id, { reference: reference.trim(), notes: notes.trim(), banned, ban_notes: banNotes.trim() });
      if (reference.trim()) await markDeclared();
      setSaved(true);
      await onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
  }

  return (
    <section className="card flat stack">
      <h3>6. Récépissé et suivi</h3>
      <p className="small muted">
        L'autorité qui reçoit la déclaration doit délivrer un récépissé. Gardez-en une photo ici : c'est votre preuve.
      </p>
      <label className="btn btn-yellow upload">
        {uploading ? "Envoi…" : "📷 Ajouter la photo ou le PDF du récépissé"}
        <input type="file" accept="image/*,application/pdf" capture="environment" onChange={upload} disabled={uploading} hidden />
      </label>
      <DocumentList docs={receipts} onDelete={onDelete} />
      <form onSubmit={save} className="form">
        <label>
          Numéro du récépissé
          <input value={reference} onChange={(e) => setReference(e.target.value)} />
        </label>
        <label>
          Notes (échanges avec la mairie ou la préfecture, demandes de modification…)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>
        <label className="check">
          <input type="checkbox" checked={banned} onChange={(e) => setBanned(e.target.checked)} />
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
              <textarea value={banNotes} onChange={(e) => setBanNotes(e.target.value)} rows={2} />
            </label>
          </div>
        )}
        <div className="row">
          <button className="btn btn-primary">Enregistrer</button>
          {saved && <span className="success">Enregistré.</span>}
        </div>
      </form>
    </section>
  );
}

function DocumentList({ docs, onDelete }: { docs: DeclarationDocument[]; onDelete: (d: DeclarationDocument) => void }) {
  if (docs.length === 0) return null;
  return (
    <ul className="list">
      {docs.map((d) => (
        <li key={d.id} className="list-row">
          <span className="small">
            📄 {d.file_name || "document"} · {new Date(d.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
          </span>
          <span className="row">
            <button className="btn" onClick={async () => window.open(await getDocumentUrl(d.path), "_blank")}>
              Ouvrir
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (window.confirm("Supprimer ce document du dossier ?")) onDelete(d);
              }}
            >
              Supprimer
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

function fmt(d: Date): string {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}
