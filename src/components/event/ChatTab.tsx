import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createMessage, deleteMessage, listMessages } from "../../lib/api";
import { markSeen } from "../../lib/seen";
import type { Channel, MemberRow, MessageRow } from "../../lib/types";

type Props = { eventId: string; channel: Channel; members: MemberRow[]; userId: string; canEdit: boolean };

const POLL_MS = 5000;

// Discussion d'équipe. Les nouveaux messages sont rechargés toutes les 5 secondes tant que l'onglet est visible.
export function ChatTab({ eventId, channel, members, userId, canEdit }: Props) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    try {
      setMessages(await listMessages(eventId, channel));
      if (channel === "equipe") markSeen(eventId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    }
  }, [eventId, channel]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      endRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const value = body.trim();
    if (!value) return;
    setError(null);
    try {
      await createMessage(eventId, value, userId, channel);
      setBody("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await deleteMessage(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  const nameOf = (id: string) => {
    const m = members.find((x) => x.user_id === id);
    return m ? m.profiles.full_name || m.profiles.email : "Ancien membre";
  };

  return (
    <div className="stack">
      {channel === "orga" && (
        <p className="notice notice-warn small">Canal réservé aux organisateurs : les membres ne le voient pas.</p>
      )}
      <div className="chat" aria-live="polite">
        {messages.length === 0 && <p className="muted">Aucun message. Lancez la discussion.</p>}
        {messages.map((m) => {
          const mine = m.author_id === userId;
          return (
            <div key={m.id} className={mine ? "bubble mine" : "bubble"}>
              <div className="bubble-meta">
                <strong>{mine ? "Vous" : nameOf(m.author_id)}</strong>
                <span className="muted small">
                  {new Date(m.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="pre-wrap">{m.body}</div>
              {(mine || canEdit) && (
                <button className="btn btn-ghost small" onClick={() => remove(m.id)}>
                  Supprimer
                </button>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="row">
        <input
          className="grow"
          placeholder="Écrire un message à l'équipe…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
        />
        <button className="btn btn-primary">Envoyer</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
