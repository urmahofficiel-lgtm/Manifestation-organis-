import { useState } from "react";
import { EventForm } from "../EventForm";
import { EventMap } from "../EventMap";
import { setEventPublic } from "../../lib/api";
import { formatDateLong } from "../../lib/dates";
import { THEMES, type EventRow } from "../../lib/types";
import type { EventInput } from "../../lib/api";

type Props = {
  event: EventRow;
  canEdit: boolean;
  onSave: (input: EventInput) => Promise<void>;
  onDelete?: () => void;
  onPublicChange: () => Promise<void>;
};

export function InfoTab({ event, canEdit, onSave, onDelete, onPublicChange }: Props) {
  const [editing, setEditing] = useState(false);
  const theme = THEMES.find((t) => t.id === event.theme)?.label ?? event.theme;

  if (editing && canEdit) {
    return (
      <EventForm
        initial={event}
        showStatus
        submitLabel="Enregistrer"
        onCancel={() => setEditing(false)}
        onSubmit={async (input) => {
          await onSave(input);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="stack">
      <dl className="facts">
        <dt>Date</dt>
        <dd>
          {formatDateLong(event.starts_at)}
          {event.ends_at && ` → ${new Date(event.ends_at).toLocaleString("fr-FR", { timeStyle: "short" })}`}
        </dd>
        {event.organizer_name && (
          <>
            <dt>Organisé par</dt>
            <dd>{event.organizer_name}</dd>
          </>
        )}
        <dt>Thème</dt>
        <dd>{theme}</dd>
        <dt>Lieu</dt>
        <dd>
          {event.place_name || "—"}
          {event.address && <div className="muted small">{event.address}</div>}
        </dd>
        <dt>Participants attendus</dt>
        <dd>{event.expected_count ?? "—"}</dd>
      </dl>

      {event.description && <p className="pre-wrap">{event.description}</p>}

      <EventMap lat={event.lat} lng={event.lng} />

      <SharePanel event={event} canEdit={canEdit} onChange={onPublicChange} />

      <div className="row wrap">
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            Modifier
          </button>
        )}
        {onDelete && (
          <button className="btn btn-danger" onClick={onDelete}>
            Supprimer l'événement
          </button>
        )}
      </div>
    </div>
  );
}

function SharePanel({ event, canEdit, onChange }: { event: EventRow; canEdit: boolean; onChange: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = `${window.location.origin}/e/${event.id}`;
  const message = `${event.title} : ${formatDateLong(event.starts_at)}${event.place_name ? `, ${event.place_name}` : ""}. ${url}`;

  async function toggle(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      await setEventPublic(event.id, next);
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiez ce lien :", url);
    }
  }

  return (
    <section className="notice notice-warn stack">
      <h3>Page publique à partager</h3>
      <p className="small muted">
        Une affiche en ligne avec le titre, la date, le lieu, la carte et les slogans validés. Les membres, tâches,
        messages et démarches ne sont jamais visibles du public.
      </p>
      {canEdit ? (
        <label className="switch">
          <input type="checkbox" checked={event.is_public} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
          {event.is_public ? "Page publique activée" : "Activer la page publique"}
        </label>
      ) : (
        !event.is_public && <p className="small">Un organisateur peut activer la page publique.</p>
      )}
      {event.is_public && (
        <div className="share">
          <a className="btn" href={url} target="_blank" rel="noreferrer">
            Voir la page
          </a>
          <button className="btn" onClick={copy}>
            {copied ? "Lien copié" : "Copier le lien"}
          </button>
          <a className="btn btn-yellow" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
            Partager sur WhatsApp
          </a>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
