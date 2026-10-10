import { useState, type FormEvent } from "react";
import { addMemberByEmail, removeMember, updateMemberRole } from "../../lib/api";
import { ROLE_LABELS, type MemberRow, type Role } from "../../lib/types";

type Props = {
  eventId: string;
  members: MemberRow[];
  currentUserId: string;
  canEdit: boolean;
  onChange: () => Promise<void>;
};

export function TeamTab({ eventId, members, currentUserId, canEdit, onChange }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"organizer" | "member">("member");
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      await addMemberByEmail(eventId, email, role);
      setEmail("");
    });
  }

  const sorted = [...members].sort((a, b) => roleRank(a.role) - roleRank(b.role));

  return (
    <div className="stack">
      <ul className="list">
        {sorted.map((m) => {
          const isMe = m.user_id === currentUserId;
          const isOwner = m.role === "owner";
          return (
            <li key={m.user_id} className="list-row">
              <div>
                <strong>{m.profiles.full_name || m.profiles.email}</strong>
                {isMe && <span className="muted small"> (vous)</span>}
                <div className="muted small">{m.profiles.email}</div>
              </div>
              <div className="row">
                {canEdit && !isOwner ? (
                  <select
                    value={m.role}
                    onChange={(e) => run(() => updateMemberRole(eventId, m.user_id, e.target.value as Role))}
                  >
                    <option value="organizer">Organisateur</option>
                    <option value="member">Membre</option>
                  </select>
                ) : (
                  <span className="badge">{ROLE_LABELS[m.role]}</span>
                )}
                {((canEdit && !isOwner) || (isMe && !isOwner)) && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      if (!window.confirm(isMe ? "Quitter cet événement ?" : "Retirer cette personne ?")) return;
                      run(() => removeMember(eventId, m.user_id));
                    }}
                  >
                    {isMe ? "Quitter" : "Retirer"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {canEdit && (
        <form onSubmit={add} className="card form">
          <h3>Ajouter une personne</h3>
          <p className="muted small">La personne doit déjà avoir un compte avec cette adresse e-mail.</p>
          <div className="row">
            <input
              type="email"
              placeholder="adresse@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <select value={role} onChange={(e) => setRole(e.target.value as "organizer" | "member")}>
              <option value="member">Membre</option>
              <option value="organizer">Organisateur</option>
            </select>
            <button className="btn btn-primary">Ajouter</button>
          </div>
        </form>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}

function roleRank(role: Role): number {
  return { owner: 0, organizer: 1, member: 2 }[role];
}
