import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createEvent, getMyProfile, listEvents } from "../lib/api";
import { useAuth } from "../lib/auth";
import { EventForm } from "../components/EventForm";
import { StatusBadge } from "../components/StatusBadge";
import { THEMES, type EventRow, type MyProfile } from "../lib/types";

export function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [profile, setProfile] = useState<MyProfile | null>(null);

  async function load() {
    try {
      setEvents(await listEvents());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les événements.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (user) getMyProfile(user.id).then(setProfile).catch(() => setProfile(null));
  }, [user]);

  const now = Date.now();
  const upcoming = events?.filter((e) => new Date(e.starts_at).getTime() >= now) ?? [];
  const past = events?.filter((e) => new Date(e.starts_at).getTime() < now) ?? [];

  return (
    <>
      <div className="page-head">
        <h1>Mes événements</h1>
        {!creating && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            + Nouvel événement
          </button>
        )}
      </div>

      {creating && (
        <section className="card">
          <h2>Nouvel événement</h2>
          <EventForm
            initial={{ organizer_name: profile?.organization_name || profile?.full_name || "" }}
            key={profile?.id ?? "no-profile"}
            submitLabel="Créer l'événement"
            onCancel={() => setCreating(false)}
            onSubmit={async (input) => {
              if (!user) return;
              const id = await createEvent(input, user.id);
              navigate(`/evenements/${id}`);
            }}
          />
        </section>
      )}

      {error && <p className="error">{error}</p>}
      {events === null && !error && <p className="muted">Chargement…</p>}

      {events !== null && events.length === 0 && !creating && (
        <p className="muted">Aucun événement pour l'instant. Créez le premier avec le bouton ci-dessus.</p>
      )}

      {upcoming.length > 0 && <EventList title="À venir" events={upcoming} />}
      {past.length > 0 && <EventList title="Passés" events={past} />}
    </>
  );
}

function EventList({ title, events }: { title: string; events: EventRow[] }) {
  return (
    <section>
      <h2>{title}</h2>
      <ul className="event-list">
        {events.map((e) => {
          const theme = THEMES.find((t) => t.id === e.theme)?.label ?? e.theme;
          return (
            <li key={e.id} className="card event-item">
              <Link to={`/evenements/${e.id}`} className="event-title">
                {e.title}
              </Link>
              <div className="muted small">
                {new Date(e.starts_at).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
                {e.place_name && ` · ${e.place_name}`} · {theme}
              </div>
              <StatusBadge status={e.status} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
