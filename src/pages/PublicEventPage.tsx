import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicEvent, getPublicSlogans } from "../lib/api";
import { formatDateLong } from "../lib/dates";
import { EventMap } from "../components/EventMap";
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

      {event.description && (
        <section className="card">
          <h2>Pourquoi on se mobilise</h2>
          <p className="pre-wrap">{event.description}</p>
        </section>
      )}

      {event.lat !== null && event.lng !== null && (
        <section className="card">
          <h2>Point de rassemblement</h2>
          <EventMap lat={event.lat} lng={event.lng} height={300} />
          {mapsUrl && (
            <p className="small" style={{ marginTop: "0.6rem" }}>
              <a href={mapsUrl} target="_blank" rel="noreferrer">
                Ouvrir dans OpenStreetMap
              </a>
            </p>
          )}
        </section>
      )}

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
