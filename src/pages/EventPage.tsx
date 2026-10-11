import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteEvent, getEvent, listMembers, updateEvent, type EventInput } from "../lib/api";
import { useAuth } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";
import { InfoTab } from "../components/event/InfoTab";
import { TeamTab } from "../components/event/TeamTab";
import { TasksTab } from "../components/event/TasksTab";
import { MaterialTab } from "../components/event/MaterialTab";
import { AnnouncementsTab } from "../components/event/AnnouncementsTab";
import { SlogansTab } from "../components/event/SlogansTab";
import { ChatTab } from "../components/event/ChatTab";
import { InvitesTab } from "../components/event/InvitesTab";
import { DeclarationTab } from "../components/event/DeclarationTab";
import type { EventRow, MemberRow } from "../lib/types";

const TABS = [
  { id: "infos", label: "Infos & carte" },
  { id: "equipe", label: "Équipe" },
  { id: "taches", label: "Tâches" },
  { id: "materiel", label: "Matériel" },
  { id: "slogans", label: "Slogans" },
  { id: "discussion", label: "Discussion" },
  { id: "invitations", label: "Invitations" },
  { id: "annonces", label: "Annonces" },
  { id: "demarches", label: "Démarches" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function EventPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [tab, setTab] = useState<TabId>("infos");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [ev, mem] = await Promise.all([getEvent(id), listMembers(id)]);
      setEvent(ev);
      setMembers(mem);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Événement introuvable.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <p className="error">
        {error} <Link to="/evenements">Retour aux événements</Link>
      </p>
    );
  }
  if (!event || !user) return <p className="muted">Chargement…</p>;

  const myRole = members.find((m) => m.user_id === user.id)?.role;
  const canEdit = myRole === "owner" || myRole === "organizer";
  const isOwner = myRole === "owner";

  async function saveInfo(input: EventInput) {
    await updateEvent(id, input);
    await load();
  }

  async function removeEvent() {
    if (!window.confirm("Supprimer définitivement cet événement et toutes ses données ?")) return;
    await deleteEvent(id);
    navigate("/evenements");
  }

  return (
    <>
      <p>
        <Link to="/evenements">← Mes événements</Link>
      </p>
      <div className="page-head">
        <div>
          <h1>{event.title}</h1>
          <div className="row">
            <StatusBadge status={event.status} />
            <span className="muted small">Vous êtes : {myRole ? roleLabel(myRole) : "non membre"}</span>
          </div>
        </div>
      </div>

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? "tab active" : "tab"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section className="card">
        {tab === "infos" && (
          <InfoTab event={event} canEdit={canEdit} onSave={saveInfo} onDelete={isOwner ? removeEvent : undefined} />
        )}
        {tab === "equipe" && (
          <TeamTab eventId={id} members={members} currentUserId={user.id} canEdit={canEdit} onChange={load} />
        )}
        {tab === "taches" && <TasksTab eventId={id} members={members} userId={user.id} canEdit={canEdit} />}
        {tab === "materiel" && <MaterialTab eventId={id} members={members} canEdit={canEdit} />}
        {tab === "slogans" && (
          <SlogansTab eventId={id} theme={event.theme} members={members} userId={user.id} canEdit={canEdit} />
        )}
        {tab === "discussion" && <ChatTab eventId={id} members={members} userId={user.id} canEdit={canEdit} />}
        {tab === "invitations" &&
          (canEdit ? (
            <InvitesTab eventId={id} userId={user.id} />
          ) : (
            <p className="muted">Seuls les organisateurs peuvent créer des liens d'invitation.</p>
          ))}
        {tab === "annonces" && <AnnouncementsTab eventId={id} userId={user.id} canEdit={canEdit} />}
        {tab === "demarches" && <DeclarationTab eventId={id} event={event} canEdit={canEdit} />}
      </section>
    </>
  );
}

function roleLabel(role: MemberRow["role"]): string {
  return { owner: "propriétaire", organizer: "organisateur", member: "membre" }[role];
}
