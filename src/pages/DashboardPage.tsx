import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listEvents, listMyOpenTasks, setTaskDone } from "../lib/api";
import { useAuth } from "../lib/auth";
import { countdownLabel, formatDateLong, formatDateShort } from "../lib/dates";
import { StatusBadge } from "../components/StatusBadge";
import { THEMES, THEME_COLORS, type EventRow, type MyTask } from "../lib/types";

export function DashboardPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadTasks() {
    if (!user) return;
    try {
      setTasks(await listMyOpenTasks(user.id));
    } catch {
      setTasks([]);
    }
  }

  useEffect(() => {
    listEvents()
      .then(setEvents)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Impossible de charger les événements."));
    loadTasks();
  }, [user]);

  async function complete(task: MyTask) {
    try {
      await setTaskDone(task.id, true);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    }
  }

  const now = Date.now();
  const upcoming = events?.filter((e) => new Date(e.starts_at).getTime() >= now - 12 * 3600 * 1000) ?? [];
  const past = events?.filter((e) => new Date(e.starts_at).getTime() < now - 12 * 3600 * 1000).reverse() ?? [];
  const next = upcoming[0];

  return (
    <>
      <div className="page-head">
        <h1>Mes manifs</h1>
        <Link to="/evenements/nouveau" className="btn btn-primary desktop-only">
          + Nouvelle manif
        </Link>
      </div>

      {error && <p className="error">{error}</p>}
      {events === null && !error && <p className="muted">Chargement…</p>}

      {events !== null && events.length === 0 && (
        <div className="empty">
          <h2>Pas encore de manif</h2>
          <p className="muted">Créez votre premier événement, puis invitez votre équipe.</p>
          <Link to="/evenements/nouveau" className="btn btn-primary btn-lg">
            + Créer une manif
          </Link>
        </div>
      )}

      {next && (
        <Link to={`/evenements/${next.id}`} className="next-poster" style={{ background: THEME_COLORS[next.theme] }}>
          <span className="kicker">Prochaine manif</span>
          <h2>{next.title}</h2>
          <span className="countdown">{countdownLabel(next.starts_at)}</span>
          <div className="meta">
            {formatDateLong(next.starts_at)}
            {next.place_name && ` · ${next.place_name}`}
          </div>
        </Link>
      )}

      {tasks.length > 0 && (
        <section className="card">
          <h2>Mes tâches à faire</h2>
          <ul className="list">
            {tasks.map((t) => (
              <li key={t.id} className="list-row">
                <label className="check">
                  <input type="checkbox" onChange={() => complete(t)} />
                  <span>{t.title}</span>
                </label>
                {t.events && (
                  <Link to={`/evenements/${t.event_id}/taches`} className="small">
                    {t.events.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {upcoming.length > 0 && <EventGrid title="À venir" events={upcoming} />}
      {past.length > 0 && <EventGrid title="Passées" events={past} />}
    </>
  );
}

function EventGrid({ title, events }: { title: string; events: EventRow[] }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      <ul className="event-grid">
        {events.map((e) => (
          <li key={e.id}>
            <Link to={`/evenements/${e.id}`} className="event-card">
              <span className="event-card-band" style={{ background: THEME_COLORS[e.theme] }} />
              <span className="event-card-body">
                <span className="row between">
                  <strong>{formatDateShort(e.starts_at)}</strong>
                  <span className="muted small">{countdownLabel(e.starts_at)}</span>
                </span>
                <span className="event-card-title">{e.title}</span>
                <span className="muted small">
                  {THEMES.find((t) => t.id === e.theme)?.label}
                  {e.place_name && ` · ${e.place_name}`}
                </span>
                <StatusBadge status={e.status} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
