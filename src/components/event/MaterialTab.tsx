import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createMaterial, deleteMaterial, listMaterials, updateMaterial } from "../../lib/api";
import type { MaterialRow, MemberRow } from "../../lib/types";

type Props = { eventId: string; members: MemberRow[]; canEdit: boolean };

export function MaterialTab({ eventId, members, canEdit }: Props) {
  const [items, setItems] = useState<MaterialRow[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [location, setLocation] = useState("");
  const [holder, setHolder] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listMaterials(eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      await createMaterial(eventId, {
        name: name.trim(),
        quantity: Number(quantity) || 0,
        holder_id: holder || null,
        location: location.trim(),
      });
      setName("");
      setQuantity("1");
      setLocation("");
      setHolder("");
    });
  }

  const nameOf = (id: string | null) => {
    if (!id) return "—";
    const m = members.find((x) => x.user_id === id);
    return m ? m.profiles.full_name || m.profiles.email : "Inconnu";
  };

  return (
    <div className="stack">
      <form onSubmit={add} className="row wrap">
        <input placeholder="Matériel (ex. : banderoles)" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} className="grow" />
        <input type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="qty" aria-label="Quantité" />
        <input placeholder="Où il se trouve" value={location} onChange={(e) => setLocation(e.target.value)} />
        <select value={holder} onChange={(e) => setHolder(e.target.value)}>
          <option value="">Personne ne le garde</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.profiles.full_name || m.profiles.email}
            </option>
          ))}
        </select>
        <button className="btn btn-primary">Ajouter</button>
      </form>

      {items.length === 0 ? (
        <p className="muted">Aucun matériel enregistré.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Matériel</th>
              <th>Qté</th>
              <th>Gardé par</th>
              <th>Emplacement</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>
                  <select
                    value={item.holder_id ?? ""}
                    onChange={(e) => run(() => updateMaterial(item.id, { holder_id: e.target.value || null }))}
                    aria-label={`Gardien de ${item.name}`}
                  >
                    <option value="">{nameOf(null)}</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profiles.full_name || m.profiles.email}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    defaultValue={item.location}
                    onBlur={(e) => {
                      if (e.target.value !== item.location) run(() => updateMaterial(item.id, { location: e.target.value }));
                    }}
                    aria-label={`Emplacement de ${item.name}`}
                  />
                </td>
                <td>
                  {canEdit && (
                    <button className="btn btn-ghost" onClick={() => run(() => deleteMaterial(item.id))}>
                      Supprimer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
