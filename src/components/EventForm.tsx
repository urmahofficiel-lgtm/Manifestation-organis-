import { useState, type FormEvent } from "react";
import { EventMap } from "./EventMap";
import { STATUSES, THEMES, type EventRow, type StatusId, type ThemeId } from "../lib/types";
import type { EventInput } from "../lib/api";

type Props = {
  initial?: Partial<EventRow>;
  submitLabel: string;
  showStatus?: boolean;
  onSubmit: (input: EventInput) => Promise<void>;
  onCancel?: () => void;
};

// Formulaire partagé : création d'un événement et modification des informations.
export function EventForm({ initial, submitLabel, showStatus = false, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [theme, setTheme] = useState<ThemeId>(initial?.theme ?? "autre");
  const [status, setStatus] = useState<StatusId>(initial?.status ?? "brouillon");
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.starts_at));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial?.ends_at ?? undefined));
  const [placeName, setPlaceName] = useState(initial?.place_name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [lat, setLat] = useState<number | null>(initial?.lat ?? null);
  const [lng, setLng] = useState<number | null>(initial?.lng ?? null);
  const [expected, setExpected] = useState(initial?.expected_count?.toString() ?? "");
  const [organizer, setOrganizer] = useState(initial?.organizer_name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (endsAt && new Date(endsAt) < new Date(startsAt)) {
      setError("La fin doit être après le début.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        theme,
        status,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        place_name: placeName.trim(),
        address: address.trim(),
        lat,
        lng,
        expected_count: expected ? Number(expected) : null,
        organizer_name: organizer.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="form">
      <label>
        Titre
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required />
      </label>
      <label>
        Organisé par
        <input
          value={organizer}
          onChange={(e) => setOrganizer(e.target.value)}
          maxLength={120}
          placeholder="Nom de l'association, du syndicat, du collectif ou des organisateurs"
        />
      </label>
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </label>

      <div className="grid-2">
        <label>
          Thème
          <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeId)}>
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {showStatus && (
          <label>
            Statut
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusId)}>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="grid-2">
        <label>
          Début
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
        </label>
        <label>
          Fin (facultatif)
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </label>
      </div>

      <div className="grid-2">
        <label>
          Nom du lieu
          <input value={placeName} onChange={(e) => setPlaceName(e.target.value)} placeholder="Place de la République" />
        </label>
        <label>
          Adresse
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
      </div>

      <label>
        Point de rassemblement
        <span className="hint">Cliquez sur la carte pour placer le point.</span>
      </label>
      <EventMap lat={lat} lng={lng} onPick={(a, b) => { setLat(a); setLng(b); }} height={240} />
      {lat !== null && lng !== null && (
        <p className="muted small">
          Coordonnées : {lat.toFixed(5)}, {lng.toFixed(5)}{" "}
          <button type="button" className="btn btn-link" onClick={() => { setLat(null); setLng(null); }}>
            Effacer
          </button>
        </p>
      )}

      <label>
        Nombre de participants attendus
        <input type="number" min={0} value={expected} onChange={(e) => setExpected(e.target.value)} />
      </label>

      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn btn-primary" disabled={busy}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

// Convertit une date ISO en valeur pour <input type="datetime-local"> (heure locale).
export function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
