import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createAnnouncement, deleteAnnouncement, listAnnouncements } from "../../lib/api";
import type { AnnouncementRow } from "../../lib/types";

type Props = { eventId: string; userId: string; canEdit: boolean };

export function AnnouncementsTab({ eventId, userId, canEdit }: Props) {
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listAnnouncements(eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function post(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createAnnouncement(eventId, body.trim(), userId);
      setBody("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await deleteAnnouncement(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  return (
    <div className="stack">
      <form onSubmit={post} className="form">
        <textarea
          placeholder="Message pour l'équipe (rendez-vous, consignes, changement d'horaire…)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          required
        />
        <div>
          <button className="btn btn-primary">Publier</button>
        </div>
      </form>

      {items.length === 0 && <p className="muted">Aucune annonce.</p>}
      <ul className="list">
        {items.map((a) => (
          <li key={a.id} className="card">
            <div className="pre-wrap">{a.body}</div>
            <div className="row between muted small">
              <span>{new Date(a.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
              {(canEdit || a.author_id === userId) && (
                <button className="btn btn-ghost" onClick={() => remove(a.id)}>
                  Supprimer
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
