import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicEvent, getPublicSlogans } from "../lib/api";
import { formatDateLong } from "../lib/dates";
import { EventMap, MapLegend } from "../components/EventMap";
import { EMERGENCY_NUMBERS, PARTICIPANT_SAFETY_TIPS } from "../lib/safety";
import { LogoMark } from "../components/Logo";
import { THEME_COLORS, type PublicEvent } from "../lib/types";

// Affiche publique d'un événement : accessible sans compte, uniquement si les organisateurs l'ont activée.
export function PublicEventPage() {
  const { id = "" } = useParams();
  const [event, setEvent] = useState<PublicEvent | null | undefined>(undefined);
  const [slogans, setSlogans] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getPublicEvent(id)
      .then((ev) => {
        setEvent(ev);
        if (ev) {
          document.title = `${ev.title} · Manifestation Organiser`;
          getPublicSlogans(id).then(setSlogans).catch(() => setSlogans([]));
        }
      })
      .catch(() => setEvent(null));
  }, [id]);

  if (event === undefined) return <p className="centered">Chargement…</p>;
  if (event === null) {
    return (
      <div className="empty">
        <h1>Page introuvable</h1>
        <p className="muted">Cet événement n'existe pas ou sa page publique n'est pas activée.</p>
        <Link to="/" className="btn">
          Découvrir Manifestation Organiser
        </Link>
      </div>
    );
  }

  const url = window.location.href;
  const message = `${event.title} : ${formatDateLong(event.starts_at)}${event.place_name ? `, ${event.place_name}` : ""}. ${url}`;
  const hasMap = event.lat !== null || event.route.length > 1 || event.pois.length > 0;
  const hour = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const mapsUrl =
    event.lat !== null && event.lng !== null
      ? `https://www.openstreetmap.org/?mlat=${event.lat}&mlon=${event.lng}#map=17/${event.lat}/${event.lng}`
      : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiez ce lien :", url);
    }
  }

  return (
    <article>
      <header className="public-poster" style={{ background: THEME_COLORS[event.theme] }}>
        {event.organizer_name && <span className="badge">{event.organizer_name} appelle à manifester</span>}
        <h1>{event.title}</h1>
        <span className="public-when">{formatDateLong(event.starts_at)}</span>
        {(event.place_name || event.address) && (
          <p className="public-where">
            📍 {event.place_name}
            {event.address && <span className="small"> · {event.address}</span>}
          </p>
        )}
      </header>

      {slogans.length > 0 && (
        <section className="section">
          <div className="stickers">
            {slogans.map((s) => (
              <span key={s} className="sticker">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {(event.purpose || event.description) && (
        <section className="card">
          <h2>Pourquoi on se mobilise</h2>
          {event.purpose && <p><strong>{event.purpose}</strong></p>}
          {event.description && <p className="pre-wrap">{event.description}</p>}
        </section>
      )}

      <section className="card">
        <h2>Horaires</h2>
        <ul className="timeline">
          <li>
            <strong>{hour(event.starts_at)}</strong> Rassemblement{event.place_name && ` · ${event.place_name}`}
          </li>
          {event.departure_at && (
            <li>
              <strong>{hour(event.departure_at)}</strong> Départ du cortège
            </li>
          )}
          {(event.dispersal_at || event.dispersal_place) && (
            <li>
              <strong>{event.dispersal_at ? hour(event.dispersal_at) : "Fin"}</strong> Dispersion
              {event.dispersal_place && ` · ${event.dispersal_place}`}
            </li>
          )}
        </ul>
      </section>

      {(hasMap || event.route_description) && (
        <section className="card">
          <h2>Parcours et points de secours</h2>
          {hasMap && <EventMap lat={event.lat} lng={event.lng} route={event.route} pois={event.pois} height={340} />}
          {hasMap && <MapLegend showRoute={event.route.length > 1} />}
          {event.route_description && <p className="pre-wrap" style={{ marginTop: "0.6rem" }}>{event.route_description}</p>}
          {mapsUrl && (
            <p className="small">
              <a href={mapsUrl} target="_blank" rel="noreferrer">
                Ouvrir le point de rassemblement dans OpenStreetMap
              </a>
            </p>
          )}
        </section>
      )}

      <section className="card safety-card">
        <h2>Pour une manif sûre</h2>
        {event.safety_notes ? (
          <p className="pre-wrap">{event.safety_notes}</p>
        ) : (
          <ul>
            {PARTICIPANT_SAFETY_TIPS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
        <div className="share">
          {EMERGENCY_NUMBERS.slice(0, 4).map((n) => (
            <a key={n.phone} className="btn" href={`tel:${n.phone}`}>
              {n.phone} · {n.label}
            </a>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Faites passer le mot</h2>
        <div className="share">
          <a className="btn btn-yellow" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
            Partager sur WhatsApp
          </a>
          <button className="btn" onClick={copy}>
            {copied ? "Lien copié" : "Copier le lien"}
          </button>
        </div>
      </section>

      <p className="row center muted small">
        <LogoMark size={20} /> Organisé avec <Link to="/">Manifestation Organiser</Link>
      </p>
    </article>
  );
}
