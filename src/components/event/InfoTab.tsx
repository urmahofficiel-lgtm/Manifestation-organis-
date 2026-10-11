import { useState } from "react";
import { EventForm } from "../EventForm";
import { EventMap } from "../EventMap";
import { THEMES, type EventRow } from "../../lib/types";
import type { EventInput } from "../../lib/api";

type Props = {
  event: EventRow;
  canEdit: boolean;
  onSave: (input: EventInput) => Promise<void>;
  onDelete?: () => void;
};

export function InfoTab({ event, canEdit, onSave, onDelete }: Props) {
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
          {new Date(event.starts_at).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
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

      <div className="row">
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
