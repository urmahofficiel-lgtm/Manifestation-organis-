import { useState, type FormEvent } from "react";
import { EventMap, MapLegend } from "../EventMap";
import { toLocalInput } from "../EventForm";
import { updateEvent } from "../../lib/api";
import { DEFAULT_SAFETY_NOTES } from "../../lib/safety";
import { POI_KINDS, type EventRow, type LatLng, type Poi, type PoiKind } from "../../lib/types";

type Props = { event: EventRow; canEdit: boolean; onSaved: () => Promise<void> };
type Mode = "parcours" | PoiKind;

// Parcours, repères, horaires et consignes : tout ce qu'il faut pour la déclaration et la sécurité du cortège.
export function ItineraryTab({ event, canEdit, onSaved }: Props) {
  const [mode, setMode] = useState<Mode>("parcours");
  const [route, setRoute] = useState<LatLng[]>(event.route ?? []);
  const [pois, setPois] = useState<Poi[]>(event.pois ?? []);
  const [purpose, setPurpose] = useState(event.purpose);
  const [routeDescription, setRouteDescription] = useState(event.route_description);
  const [departureAt, setDepartureAt] = useState(toLocalInput(event.departure_at));
  const [dispersalAt, setDispersalAt] = useState(toLocalInput(event.dispersal_at));
  const [dispersalPlace, setDispersalPlace] = useState(event.dispersal_place);
  const [municipalities, setMunicipalities] = useState(event.municipalities);
  const [safetyNotes, setSafetyNotes] = useState(event.safety_notes);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function pick(lat: number, lng: number) {
    if (!canEdit) return;
    setSaved(false);
    if (mode === "parcours") {
      setRoute((r) => [...r, [Number(lat.toFixed(6)), Number(lng.toFixed(6))]]);
    } else {
      const label = POI_KINDS.find((k) => k.id === mode)?.label ?? "";
      setPois((p) => [...p, { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), kind: mode, label }]);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (departureAt && dispersalAt && new Date(dispersalAt) < new Date(departureAt)) {
      setError("La dispersion doit être après le départ du cortège.");
      return;
    }
    setBusy(true);
    try {
      await updateEvent(event.id, {
        purpose: purpose.trim(),
        route,
        pois: pois.map((p) => ({ ...p, label: p.label.trim() })),
        route_description: routeDescription.trim(),
        departure_at: departureAt ? new Date(departureAt).toISOString() : null,
        dispersal_at: dispersalAt ? new Date(dispersalAt).toISOString() : null,
        dispersal_place: dispersalPlace.trim(),
        municipalities: municipalities.trim(),
        safety_notes: safetyNotes.trim(),
      });
      setSaved(true);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="form">
      <label>
        Objet de la manifestation (pour la déclaration)
        <textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Ex. : demander le maintien des urgences de l'hôpital public de la ville"
          disabled={!canEdit}
        />
      </label>

      <div className="grid-2">
        <label>
          Départ du cortège
          <input type="datetime-local" value={departureAt} onChange={(e) => setDepartureAt(e.target.value)} disabled={!canEdit} />
          <span className="hint">Le rassemblement commence à l'heure de l'événement.</span>
        </label>
        <label>
          Fin et dispersion
          <input type="datetime-local" value={dispersalAt} onChange={(e) => setDispersalAt(e.target.value)} disabled={!canEdit} />
        </label>
      </div>

      <div className="grid-2">
        <label>
          Lieu de dispersion
          <input value={dispersalPlace} onChange={(e) => setDispersalPlace(e.target.value)} maxLength={200} disabled={!canEdit} />
        </label>
        <label>
          Communes traversées
          <input value={municipalities} onChange={(e) => setMunicipalities(e.target.value)} maxLength={300} placeholder="Ex. : Lyon 1er, Lyon 2e" disabled={!canEdit} />
        </label>
      </div>

      <section className="stack">
        <h3>Parcours et repères</h3>
        {canEdit && (
          <>
            <p className="small muted">
              Choisissez ce que vous placez, puis cliquez sur la carte. Pour le parcours, cliquez dans l'ordre du cortège,
              du départ à l'arrivée.
            </p>
            <div className="chips" role="radiogroup" aria-label="Élément à placer">
              <button type="button" className={mode === "parcours" ? "chip active" : "chip"} onClick={() => setMode("parcours")}>
                Parcours
              </button>
              {POI_KINDS.map((k) => (
                <button key={k.id} type="button" className={mode === k.id ? "chip active" : "chip"} onClick={() => setMode(k.id)}>
                  <i className="dot" style={{ background: k.color }} /> {k.label}
                </button>
              ))}
            </div>
          </>
        )}
        <EventMap lat={event.lat} lng={event.lng} route={route} pois={pois} onPick={canEdit ? pick : undefined} height={380} />
        <MapLegend />
        {canEdit && (
          <div className="row wrap">
            <span className="small">
              {route.length} point{route.length > 1 ? "s" : ""} de parcours · {pois.length} repère{pois.length > 1 ? "s" : ""}
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => setRoute((r) => r.slice(0, -1))} disabled={!route.length}>
              Annuler le dernier point
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setRoute([])} disabled={!route.length}>
              Effacer le parcours
            </button>
          </div>
        )}
        {pois.length > 0 && (
          <ul className="list">
            {pois.map((p, i) => (
              <li key={i} className="list-row">
                <span className="row">
                  <i className="dot" style={{ background: POI_KINDS.find((k) => k.id === p.kind)?.color }} />
                  {canEdit ? (
                    <input
                      value={p.label}
                      maxLength={80}
                      onChange={(e) => setPois((all) => all.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                      aria-label="Nom du repère"
                    />
                  ) : (
                    <span>{p.label}</span>
                  )}
                </span>
                {canEdit && (
                  <button type="button" className="btn btn-ghost" onClick={() => setPois((all) => all.filter((_, j) => j !== i))}>
                    Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <label>
          Itinéraire écrit (rues empruntées)
          <textarea
            value={routeDescription}
            onChange={(e) => setRouteDescription(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Ex. : Place de la République, boulevard du Temple, boulevard Beaumarchais, Place de la Bastille"
            disabled={!canEdit}
          />
          <span className="hint">Il figure dans la lettre de déclaration, avec le plan en annexe.</span>
        </label>
      </section>

      <label>
        Consignes de sécurité pour les participants
        <textarea value={safetyNotes} onChange={(e) => setSafetyNotes(e.target.value)} rows={7} maxLength={2000} disabled={!canEdit} />
        {canEdit && !safetyNotes && (
          <button type="button" className="btn btn-link" onClick={() => setSafetyNotes(DEFAULT_SAFETY_NOTES)}>
            Insérer les consignes recommandées
          </button>
        )}
        <span className="hint">Elles s'affichent sur la page publique de la manif.</span>
      </label>

      {error && <p className="error">{error}</p>}
      {canEdit && (
        <div className="row">
          <button className="btn btn-primary" disabled={busy}>
            Enregistrer
          </button>
          {saved && <span className="success">Enregistré.</span>}
        </div>
      )}
    </form>
  );
}
