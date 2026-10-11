import { useEffect, useState, type FormEvent } from "react";
import { getDebrief, saveDebrief } from "../../lib/api";

type Props = { eventId: string; canEdit: boolean };

// Bilan après la manif : utile pour la prochaine fois et pour le suivi avec les autorités.
export function BilanTab({ eventId, canEdit }: Props) {
  const [participants, setParticipants] = useState("");
  const [incidents, setIncidents] = useState("");
  const [press, setPress] = useState("");
  const [lessons, setLessons] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDebrief(eventId)
      .then((d) => {
        if (d) {
          setParticipants(d.participants_estimate?.toString() ?? "");
          setIncidents(d.incidents);
          setPress(d.press);
          setLessons(d.lessons);
        }
        setLoaded(true);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Chargement impossible."));
  }, [eventId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await saveDebrief({
        event_id: eventId,
        participants_estimate: participants ? Number(participants) : null,
        incidents: incidents.trim(),
        press: press.trim(),
        lessons: lessons.trim(),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
  }

  if (!loaded) return <p className="muted">Chargement…</p>;

  return (
    <form onSubmit={save} className="form">
      <label>
        Nombre de participants estimé
        <input type="number" min={0} value={participants} onChange={(e) => setParticipants(e.target.value)} disabled={!canEdit} />
      </label>
      <label>
        Incidents (blessés, dégradations, tensions) et comment ils ont été gérés
        <textarea value={incidents} onChange={(e) => setIncidents(e.target.value)} rows={4} maxLength={3000} disabled={!canEdit} />
      </label>
      <label>
        Retombées presse et réseaux
        <textarea value={press} onChange={(e) => setPress(e.target.value)} rows={3} maxLength={2000} disabled={!canEdit} />
      </label>
      <label>
        Ce qu'on refera, ce qu'on changera
        <textarea value={lessons} onChange={(e) => setLessons(e.target.value)} rows={4} maxLength={3000} disabled={!canEdit} />
      </label>
      {error && <p className="error">{error}</p>}
      {canEdit ? (
        <div className="row">
          <button className="btn btn-primary">Enregistrer le bilan</button>
          {saved && <span className="success">Enregistré.</span>}
        </div>
      ) : (
        <p className="muted small">Seuls les organisateurs peuvent remplir le bilan.</p>
      )}
    </form>
  );
}
