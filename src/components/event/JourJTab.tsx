import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  checkIn,
  createAlert,
  createContact,
  deleteContact,
  listAlerts,
  listContacts,
  setAlertResolved,
  setFieldRole,
} from "../../lib/api";
import { countdownLabel } from "../../lib/dates";
import { EMERGENCY_NUMBERS, TEAM_SAFETY_TIPS } from "../../lib/safety";
import {
  FIELD_ROLES,
  type AlertLevel,
  type AlertRow,
  type ContactKind,
  type ContactRow,
  type EventRow,
  type FieldRole,
  type MemberRow,
} from "../../lib/types";

type Props = {
  event: EventRow;
  members: MemberRow[];
  userId: string;
  canEdit: boolean;
  onMembersChange: () => Promise<void>;
};

const POLL_MS = 5000;
const LEVELS: { id: AlertLevel; label: string }[] = [
  { id: "info", label: "Info" },
  { id: "attention", label: "Attention" },
  { id: "urgence", label: "Urgence" },
];
const CONTACT_KINDS: { id: ContactKind; label: string }[] = [
  { id: "autorites", label: "Autorités (mairie, préfecture, police)" },
  { id: "juridique", label: "Avocat ou équipe juridique" },
  { id: "secours", label: "Secours" },
  { id: "autre", label: "Autre" },
];

export function JourJTab({ event, members, userId, canEdit, onMembersChange }: Props) {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [level, setLevel] = useState<AlertLevel>("info");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState({ kind: "autorites" as ContactKind, label: "", phone: "", notes: "" });
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      setAlerts(await listAlerts(event.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    }
  }, [event.id]);

  const loadContacts = useCallback(async () => {
    try {
      setContacts(await listContacts(event.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    }
  }, [event.id]);

  useEffect(() => {
    loadAlerts();
    loadContacts();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadAlerts();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadAlerts, loadContacts]);

  async function run(action: () => Promise<void>, after?: () => Promise<void>) {
    setError(null);
    try {
      await action();
      if (after) await after();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    }
  }

  async function sendAlert(e: FormEvent) {
    e.preventDefault();
    const value = body.trim();
    if (!value) return;
    await run(async () => {
      await createAlert(event.id, userId, level, value);
      setBody("");
      setLevel("info");
    }, loadAlerts);
  }

  async function addContact(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      await createContact(event.id, { ...contact, label: contact.label.trim(), phone: contact.phone.trim(), notes: contact.notes.trim() });
      setContact({ kind: "autorites", label: "", phone: "", notes: "" });
    }, loadContacts);
  }

  const me = members.find((m) => m.user_id === userId);
  const myRole = FIELD_ROLES.find((r) => r.id === me?.field_role)?.label;
  const nameOf = (id: string) => {
    const m = members.find((x) => x.user_id === id);
    return m ? m.profiles.full_name || m.profiles.email : "Ancien membre";
  };
  const open = alerts.filter((a) => !a.resolved);
  const closed = alerts.filter((a) => a.resolved);
  const present = members.filter((m) => m.checked_in_at).length;

  return (
    <div className="stack">
      <section className="jourj-banner">
        <span className="countdown">{countdownLabel(event.starts_at)}</span>
        <div>
          <strong>Mon rôle : {myRole ?? "aucun rôle attribué"}</strong>
          <div className="small">
            {present} / {members.length} membre{members.length > 1 ? "s" : ""} à leur poste
          </div>
        </div>
        {me?.checked_in_at ? (
          <button className="btn" onClick={() => run(() => checkIn(event.id, false), onMembersChange)}>
            ✓ Je suis à mon poste
          </button>
        ) : (
          <button className="btn btn-yellow" onClick={() => run(() => checkIn(event.id, true), onMembersChange)}>
            Je suis à mon poste
          </button>
        )}
      </section>

      <section className="card">
        <h2>Alertes en direct</h2>
        <p className="notice notice-error small">
          Urgence vitale (malaise, blessé) : appelez d'abord le <a href="tel:15">15</a> ou le <a href="tel:112">112</a>, puis
          signalez-le ici.
        </p>
        <form onSubmit={sendAlert} className="form">
          <div className="chips" role="radiogroup" aria-label="Niveau de l'alerte">
            {LEVELS.map((l) => (
              <button key={l.id} type="button" className={level === l.id ? `chip active level-${l.id}` : "chip"} onClick={() => setLevel(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="row">
            <input
              className="grow"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              placeholder="Ex. : tension au croisement de la rue X, cortège qui s'étire, point d'eau vide…"
            />
            <button className="btn btn-primary">Signaler</button>
          </div>
        </form>
        {open.length === 0 && <p className="muted small">Aucune alerte en cours.</p>}
        <ul className="list">
          {open.map((a) => (
            <AlertItem key={a.id} alert={a} author={nameOf(a.author_id)} canResolve={canEdit || a.author_id === userId} onToggle={() => run(() => setAlertResolved(a.id, true), loadAlerts)} />
          ))}
        </ul>
        {closed.length > 0 && (
          <details>
            <summary className="small">Alertes traitées ({closed.length})</summary>
            <ul className="list">
              {closed.map((a) => (
                <AlertItem key={a.id} alert={a} author={nameOf(a.author_id)} canResolve={canEdit || a.author_id === userId} onToggle={() => run(() => setAlertResolved(a.id, false), loadAlerts)} />
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="card">
        <h2>Équipe sur le terrain</h2>
        <ul className="list">
          {members.map((m) => (
            <li key={m.user_id} className="list-row">
              <span className="row">
                <span className={m.checked_in_at ? "presence on" : "presence"} aria-label={m.checked_in_at ? "À son poste" : "Pas encore à son poste"} />
                <strong>{m.profiles.full_name || m.profiles.email}</strong>
              </span>
              {canEdit ? (
                <select
                  value={m.field_role ?? ""}
                  onChange={(e) => run(() => setFieldRole(event.id, m.user_id, (e.target.value || null) as FieldRole | null), onMembersChange)}
                  aria-label={`Rôle de ${m.profiles.full_name || m.profiles.email}`}
                >
                  <option value="">Sans rôle</option>
                  {FIELD_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="badge">{FIELD_ROLES.find((r) => r.id === m.field_role)?.label ?? "Sans rôle"}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Contacts</h2>
        <ul className="list">
          {EMERGENCY_NUMBERS.map((n) => (
            <li key={n.phone} className="list-row">
              <span>{n.label}</span>
              <a className="btn btn-yellow" href={n.phone === "114" ? "sms:114" : `tel:${n.phone}`}>
                {n.phone}
              </a>
            </li>
          ))}
          {contacts.map((c) => (
            <li key={c.id} className="list-row">
              <span>
                <strong>{c.label}</strong>
                <span className="muted small"> · {CONTACT_KINDS.find((k) => k.id === c.kind)?.label}</span>
                {c.notes && <div className="small muted">{c.notes}</div>}
              </span>
              <span className="row">
                {c.phone && (
                  <a className="btn" href={`tel:${c.phone.replace(/\s/g, "")}`}>
                    {c.phone}
                  </a>
                )}
                {canEdit && (
                  <button className="btn btn-ghost" onClick={() => run(() => deleteContact(c.id), loadContacts)}>
                    Retirer
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {canEdit && (
          <form onSubmit={addContact} className="form" style={{ marginTop: "1rem" }}>
            <h3>Ajouter un contact</h3>
            <div className="grid-2">
              <select value={contact.kind} onChange={(e) => setContact({ ...contact, kind: e.target.value as ContactKind })}>
                {CONTACT_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
              <input placeholder="Nom (ex. : référent préfecture)" value={contact.label} onChange={(e) => setContact({ ...contact, label: e.target.value })} maxLength={100} required />
              <input type="tel" placeholder="Téléphone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} maxLength={30} />
              <input placeholder="Note (facultatif)" value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} maxLength={300} />
            </div>
            <div>
              <button className="btn btn-primary">Ajouter</button>
            </div>
          </form>
        )}
      </section>

      <section className="card">
        <h2>Consignes pour l'équipe</h2>
        <ul>
          {TEAM_SAFETY_TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        {event.safety_notes && (
          <>
            <h3>Consignes données aux participants</h3>
            <p className="pre-wrap small">{event.safety_notes}</p>
          </>
        )}
        <Link to={`/evenements/${event.id}/parcours`} className="small">
          Voir le parcours et les points de secours
        </Link>
      </section>

      {error && <p className="error">{error}</p>}
    </div>
  );
}

function AlertItem({ alert, author, canResolve, onToggle }: { alert: AlertRow; author: string; canResolve: boolean; onToggle: () => void }) {
  return (
    <li className={`alert-item level-${alert.level}${alert.resolved ? " resolved" : ""}`}>
      <div className="row between">
        <span className="badge">{LEVELS.find((l) => l.id === alert.level)?.label}</span>
        <span className="small muted">
          {author} · {new Date(alert.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <p>{alert.body}</p>
      {canResolve && (
        <button className="btn btn-ghost small" onClick={onToggle}>
          {alert.resolved ? "Rouvrir" : "Marquer comme traitée"}
        </button>
      )}
    </li>
  );
}
