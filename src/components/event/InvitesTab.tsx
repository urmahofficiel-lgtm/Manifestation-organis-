import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createInvite, deleteInvite, listInvites, revokeInvite } from "../../lib/api";
import type { InviteRow } from "../../lib/types";

type Props = { eventId: string; userId: string };

function inviteUrl(code: string): string {
  return `${window.location.origin}/invitation/${code}`;
}

function statusOf(i: InviteRow): string {
  if (i.revoked) return "Désactivée";
  if (new Date(i.expires_at) < new Date()) return "Expirée";
  if (i.max_uses !== null && i.uses >= i.max_uses) return "Utilisée";
  return "Active";
}

export function InvitesTab({ eventId, userId }: Props) {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [role, setRole] = useState<"member" | "organizer">("member");
  const [maxUses, setMaxUses] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setInvites(await listInvites(eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    }
  }, [eventId]);

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

  async function create(e: FormEvent) {
    e.preventDefault();
    await run(() => createInvite(eventId, role, userId, maxUses ? Number(maxUses) : null));
    setMaxUses("");
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(code));
      setCopied(code);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copiez ce lien :", inviteUrl(code));
    }
  }

  return (
    <div className="stack">
      <p className="muted">
        Créez un lien et envoyez-le par message ou e-mail. Quiconque l'ouvre peut rejoindre l'événement après s'être
        connecté. Le lien est valable 30 jours.
      </p>

      <form onSubmit={create} className="row wrap">
        <select value={role} onChange={(e) => setRole(e.target.value as "member" | "organizer")}>
          <option value="member">Membre</option>
          <option value="organizer">Organisateur</option>
        </select>
        <input
          type="number"
          min={1}
          placeholder="Nombre d'utilisations (illimité)"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
          className="grow"
        />
        <button className="btn btn-primary">Créer un lien d'invitation</button>
      </form>

      {invites.length === 0 && <p className="muted">Aucune invitation créée.</p>}
      <ul className="list">
        {invites.map((i) => {
          const status = statusOf(i);
          return (
            <li key={i.id} className="list-row">
              <div className="grow">
                <div className="row wrap">
                  <span className={status === "Active" ? "badge badge-confirme" : "badge"}>{status}</span>
                  <span className="small">{i.role === "organizer" ? "Organisateur" : "Membre"}</span>
                  <span className="muted small">
                    {i.uses}
                    {i.max_uses !== null ? ` / ${i.max_uses}` : ""} utilisation{i.uses > 1 ? "s" : ""}
                  </span>
                </div>
                <code className="small break">{inviteUrl(i.code)}</code>
              </div>
              <div className="row">
                {status === "Active" && (
                  <>
                    <button className="btn" onClick={() => copy(i.code)}>
                      {copied === i.code ? "Copié" : "Copier le lien"}
                    </button>
                    <button className="btn btn-ghost" onClick={() => run(() => revokeInvite(i.id))}>
                      Désactiver
                    </button>
                  </>
                )}
                <button className="btn btn-ghost" onClick={() => run(() => deleteInvite(i.id))}>
                  Supprimer
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
