import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteEvent, getEvent, getEventSummary, listMembers, updateEvent, type EventInput } from "../lib/api";
import { useAuth } from "../lib/auth";
import { countdownLabel, formatDateLong } from "../lib/dates";
import { declarationDeadline, declarationWindow } from "../lib/declaration";
import { getLastSeen } from "../lib/seen";
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
import { ROLE_LABELS, THEME_COLORS, type EventRow, type EventSummary, type MemberRow } from "../lib/types";

const SECTIONS = [
  { id: "infos", icon: "📍", label: "Infos et carte" },
  { id: "equipe", icon: "👥", label: "Équipe" },
  { id: "taches", icon: "✅", label: "Tâches" },
  { id: "materiel", icon: "📦", label: "Matériel" },
  { id: "slogans", icon: "📣", label: "Slogans" },
  { id: "discussion", icon: "💬", label: "Discussion" },
  { id: "annonces", icon: "📌", label: "Annonces" },
  { id: "demarches", icon: "📝", label: "Démarches" },
  { id: "invitations", icon: "🔗", label: "Inviter" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function EventPage() {
  const { id = "", section } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [summary, setSummary] = useState<EventSummary | null>(null);
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

  const loadSummary = useCallback(async () => {
    if (!user) return;
    try {
      setSummary(await getEventSummary(id, user.id, getLastSeen(id)));
    } catch {
      setSummary(null);
    }
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  // Le résumé (compteurs des tuiles) est recalculé à chaque retour sur la vue d'ensemble.
  useEffect(() => {
    if (!section) loadSummary();
  }, [section, loadSummary]);

  if (error) {
    return (
      <p className="error">
        {error} <Link to="/evenements">Retour à mes manifs</Link>
      </p>
    );
  }
  if (!event || !user) return <p className="muted">Chargement…</p>;

  const myRole = members.find((m) => m.user_id === user.id)?.role;
  const canEdit = myRole === "owner" || myRole === "organizer";
  const isOwner = myRole === "owner";
  const current = SECTIONS.find((s) => s.id === section);

  async function saveInfo(input: EventInput) {
    await updateEvent(id, input);
    await load();
  }

  async function removeEvent() {
    if (!window.confirm("Supprimer définitivement cet événement et toutes ses données ?")) return;
    await deleteEvent(id);
    navigate("/evenements");
  }

  if (section && current) {
    return (
      <>
        <Link to={`/evenements/${id}`} className="back-link">
          ← {event.title}
        </Link>
        <div className="section-head">
          <span className="tile-icon" aria-hidden>
            {current.icon}
          </span>
          <h1>{current.label}</h1>
        </div>
        <div className="card">
          <Section
            section={current.id}
            event={event}
            members={members}
            userId={user.id}
            canEdit={canEdit}
            onSaveInfo={saveInfo}
            onDelete={isOwner ? removeEvent : undefined}
            onMembersChange={load}
            onPublicChange={load}
          />
        </div>
      </>
    );
  }

  const steps = buildSteps(event, summary);
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <>
      <Link to="/evenements" className="back-link">
        ← Mes manifs
      </Link>

      <header className="event-poster" style={{ background: THEME_COLORS[event.theme] }}>
        <div className="row wrap">
          <span className="countdown">{countdownLabel(event.starts_at)}</span>
          <StatusBadge status={event.status} />
          {event.is_public && <span className="badge">Page publique active</span>}
        </div>
        <h1>{event.title}</h1>
        <div className="meta">
          <span>{formatDateLong(event.starts_at)}</span>
          {event.place_name && <span>{event.place_name}</span>}
          {event.organizer_name && <span>Organisé par {event.organizer_name}</span>}
          <span className="small">Vous êtes {myRole ? ROLE_LABELS[myRole].toLowerCase() : "non membre"}</span>
        </div>
      </header>

      <section className="card">
        <div className="row between">
          <h2>Prochaines étapes</h2>
          <strong>
            {doneCount}/{steps.length}
          </strong>
        </div>
        <div className="progress" aria-hidden>
          <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
        <ul className="steps">
          {steps.map((s) => (
            <li key={s.label}>
              <Link to={`/evenements/${id}/${s.section}`} className={s.done ? "step is-done" : "step"}>
                <span className="step-mark">{s.done ? "✓" : ""}</span>
                <span className="step-label">{s.label}</span>
                {s.hint && !s.done && <span className="muted small">· {s.hint}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <nav className="tiles" aria-label="Sections de la manif">
        {SECTIONS.filter((s) => s.id !== "invitations" || canEdit).map((s) => {
          const info = tileInfo(s.id, summary);
          return (
            <Link key={s.id} to={`/evenements/${id}/${s.id}`} className={s.id === "discussion" ? "tile accent" : "tile"}>
              {info.badge ? <span className="badge badge-count">{info.badge}</span> : null}
              <span className="tile-icon" aria-hidden>
                {s.icon}
              </span>
              <span className="tile-title">{s.label}</span>
              <span className="tile-sub">{info.sub}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function Section(props: {
  section: SectionId;
  event: EventRow;
  members: MemberRow[];
  userId: string;
  canEdit: boolean;
  onSaveInfo: (input: EventInput) => Promise<void>;
  onDelete?: () => void;
  onMembersChange: () => Promise<void>;
  onPublicChange: () => Promise<void>;
}) {
  const { section, event, members, userId, canEdit } = props;
  switch (section) {
    case "infos":
      return (
        <InfoTab
          event={event}
          canEdit={canEdit}
          onSave={props.onSaveInfo}
          onDelete={props.onDelete}
          onPublicChange={props.onPublicChange}
        />
      );
    case "equipe":
      return (
        <TeamTab eventId={event.id} members={members} currentUserId={userId} canEdit={canEdit} onChange={props.onMembersChange} />
      );
    case "taches":
      return <TasksTab eventId={event.id} members={members} userId={userId} canEdit={canEdit} />;
    case "materiel":
      return <MaterialTab eventId={event.id} members={members} canEdit={canEdit} />;
    case "slogans":
      return <SlogansTab eventId={event.id} theme={event.theme} members={members} userId={userId} canEdit={canEdit} />;
    case "discussion":
      return <ChatTab eventId={event.id} members={members} userId={userId} canEdit={canEdit} />;
    case "annonces":
      return <AnnouncementsTab eventId={event.id} userId={userId} canEdit={canEdit} />;
    case "demarches":
      return <DeclarationTab eventId={event.id} event={event} canEdit={canEdit} />;
    case "invitations":
      return canEdit ? (
        <InvitesTab eventId={event.id} userId={userId} />
      ) : (
        <p className="muted">Seuls les organisateurs peuvent créer des liens d'invitation.</p>
      );
  }
}

type Step = { label: string; section: SectionId; done: boolean; hint?: string };

function buildSteps(event: EventRow, s: EventSummary | null): Step[] {
  const start = new Date(event.starts_at);
  const windowState = declarationWindow(start, new Date());
  const declarationHint =
    windowState === "trop_tot"
      ? "pas encore possible"
      : windowState === "depassee"
        ? "délai dépassé"
        : `avant le ${declarationDeadline(start).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
  return [
    { label: "Placer le point de rassemblement", section: "infos", done: event.lat !== null },
    { label: "Inviter l'équipe", section: "invitations", done: (s?.members ?? 0) > 1 },
    { label: "Répartir les tâches", section: "taches", done: (s?.tasksTotal ?? 0) > 0 },
    { label: "Lister le matériel", section: "materiel", done: (s?.materials ?? 0) > 0 },
    { label: "Choisir les slogans", section: "slogans", done: (s?.slogansValid ?? 0) > 0 },
    { label: "Déclarer la manifestation", section: "demarches", done: Boolean(s?.declarationSubmitted), hint: declarationHint },
    { label: "Partager la page publique", section: "infos", done: event.is_public },
  ];
}

function tileInfo(id: SectionId, s: EventSummary | null): { sub: string; badge?: number } {
  if (!s) return { sub: "" };
  switch (id) {
    case "infos":
      return { sub: "Lieu, date, partage" };
    case "equipe":
      return { sub: `${s.members} membre${s.members > 1 ? "s" : ""}` };
    case "taches":
      return { sub: s.tasksTotal ? `${s.tasksDone}/${s.tasksTotal} faites` : "Aucune tâche" };
    case "materiel":
      return { sub: s.materials ? `${s.materials} élément${s.materials > 1 ? "s" : ""}` : "Rien de listé" };
    case "slogans":
      return {
        sub: `${s.slogansValid} validé${s.slogansValid > 1 ? "s" : ""}`,
        badge: s.slogansProposed || undefined,
      };
    case "discussion":
      return { sub: s.unread ? `${s.unread} non lu${s.unread > 1 ? "s" : ""}` : `${s.messages} message${s.messages > 1 ? "s" : ""}`, badge: s.unread || undefined };
    case "annonces":
      return { sub: `${s.announcements} annonce${s.announcements > 1 ? "s" : ""}` };
    case "demarches":
      return { sub: s.declarationSubmitted ? "Déclarée" : "À déclarer" };
    case "invitations":
      return { sub: "Lien à partager" };
  }
}
