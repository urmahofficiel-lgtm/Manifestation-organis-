import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteEvent, getEvent, getEventSummary, listMembers, updateEvent, type EventInput } from "../lib/api";
import { useAuth } from "../lib/auth";
import { countdownLabel, formatDateLong } from "../lib/dates";
import { daysUntil } from "../lib/declaration";
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
import { ItineraryTab } from "../components/event/ItineraryTab";
import { JourJTab } from "../components/event/JourJTab";
import { BilanTab } from "../components/event/BilanTab";
import { ROLE_LABELS, THEME_COLORS, type EventRow, type EventSummary, type MemberRow } from "../lib/types";

const SECTIONS = [
  { id: "infos", icon: "📍", label: "Infos et carte", editorsOnly: false },
  { id: "parcours", icon: "🗺️", label: "Parcours et horaires", editorsOnly: false },
  { id: "demarches", icon: "📝", label: "Déclaration", editorsOnly: false },
  { id: "jourj", icon: "🚨", label: "Jour J", editorsOnly: false },
  { id: "equipe", icon: "👥", label: "Équipe", editorsOnly: false },
  { id: "taches", icon: "✅", label: "Tâches", editorsOnly: false },
  { id: "materiel", icon: "📦", label: "Matériel", editorsOnly: false },
  { id: "slogans", icon: "📣", label: "Slogans", editorsOnly: false },
  { id: "discussion", icon: "💬", label: "Discussion", editorsOnly: false },
  { id: "orga", icon: "🔒", label: "Chat orga", editorsOnly: true },
  { id: "annonces", icon: "📌", label: "Annonces", editorsOnly: false },
  { id: "invitations", icon: "🔗", label: "Inviter", editorsOnly: true },
  { id: "bilan", icon: "📊", label: "Bilan", editorsOnly: false },
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

  const steps = buildSteps(event, summary, members);
  const isSoon = daysUntil(new Date(event.starts_at), new Date()) <= 1 && daysUntil(new Date(event.starts_at), new Date()) >= 0;
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
        {SECTIONS.filter((s) => !s.editorsOnly || canEdit).map((s) => {
          const info = tileInfo(s.id, summary, members);
          const accent = s.id === (isSoon ? "jourj" : "discussion");
          return (
            <Link key={s.id} to={`/evenements/${id}/${s.id}`} className={accent ? "tile accent" : "tile"}>
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
  const editorsOnly = <p className="muted">Cette section est réservée aux organisateurs.</p>;
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
    case "parcours":
      return <ItineraryTab event={event} canEdit={canEdit} onSaved={props.onPublicChange} />;
    case "demarches":
      return <DeclarationTab event={event} members={members} userId={userId} canEdit={canEdit} />;
    case "jourj":
      return <JourJTab event={event} members={members} userId={userId} canEdit={canEdit} onMembersChange={props.onMembersChange} />;
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
      return <ChatTab eventId={event.id} channel="equipe" members={members} userId={userId} canEdit={canEdit} />;
    case "orga":
      return canEdit ? <ChatTab eventId={event.id} channel="orga" members={members} userId={userId} canEdit={canEdit} /> : editorsOnly;
    case "annonces":
      return <AnnouncementsTab eventId={event.id} userId={userId} canEdit={canEdit} />;
    case "invitations":
      return canEdit ? <InvitesTab eventId={event.id} userId={userId} /> : editorsOnly;
    case "bilan":
      return <BilanTab eventId={event.id} canEdit={canEdit} />;
  }
}

type Step = { label: string; section: SectionId; done: boolean; hint?: string };

function buildSteps(event: EventRow, s: EventSummary | null, members: MemberRow[]): Step[] {
  const start = new Date(event.starts_at);
  const windowState = declarationWindow(start, new Date());
  const declarationHint =
    windowState === "trop_tot"
      ? "pas encore possible"
      : windowState === "depassee"
        ? "délai dépassé"
        : `avant le ${declarationDeadline(start).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
  const planDone =
    (event.route.length > 1 || event.route_description.trim().length > 0) &&
    Boolean(event.dispersal_at) &&
    event.safety_notes.trim().length > 0;
  return [
    { label: "Placer le point de rassemblement", section: "infos", done: event.lat !== null },
    { label: "Tracer le parcours, les horaires et les consignes", section: "parcours", done: planDone },
    { label: "Inviter l'équipe", section: "invitations", done: (s?.members ?? 0) > 1 },
    { label: "Attribuer les rôles du jour J (service d'ordre, secours…)", section: "jourj", done: members.some((m) => m.field_role) },
    { label: "Déclarer la manifestation", section: "demarches", done: Boolean(s?.declarationSubmitted), hint: declarationHint },
    { label: "Répartir les tâches", section: "taches", done: (s?.tasksTotal ?? 0) > 0 },
    { label: "Partager la page publique", section: "infos", done: event.is_public },
  ];
}

function tileInfo(id: SectionId, s: EventSummary | null, members: MemberRow[]): { sub: string; badge?: number } {
  if (!s) return { sub: "" };
  switch (id) {
    case "infos":
      return { sub: "Lieu, date, partage" };
    case "parcours":
      return { sub: "Itinéraire, secours, consignes" };
    case "demarches":
      return { sub: s.declarationSubmitted ? "Déposée" : "À préparer" };
    case "jourj": {
      const present = members.filter((m) => m.checked_in_at).length;
      return {
        sub: s.alertsOpen ? `${s.alertsOpen} alerte${s.alertsOpen > 1 ? "s" : ""} en cours` : `${present}/${members.length} à leur poste`,
        badge: s.alertsOpen || undefined,
      };
    }
    case "equipe":
      return { sub: `${s.members} membre${s.members > 1 ? "s" : ""}` };
    case "taches":
      return { sub: s.tasksTotal ? `${s.tasksDone}/${s.tasksTotal} faites` : "Aucune tâche" };
    case "materiel":
      return { sub: s.materials ? `${s.materials} élément${s.materials > 1 ? "s" : ""}` : "Rien de listé" };
    case "slogans":
      return { sub: `${s.slogansValid} validé${s.slogansValid > 1 ? "s" : ""}`, badge: s.slogansProposed || undefined };
    case "discussion":
      return {
        sub: s.unread ? `${s.unread} non lu${s.unread > 1 ? "s" : ""}` : `${s.messages} message${s.messages > 1 ? "s" : ""}`,
        badge: s.unread || undefined,
      };
    case "orga":
      return { sub: "Réservé aux organisateurs" };
    case "annonces":
      return { sub: `${s.announcements} annonce${s.announcements > 1 ? "s" : ""}` };
    case "invitations":
      return { sub: "Lien à partager" };
    case "bilan":
      return { sub: "Après la manif" };
  }
}
