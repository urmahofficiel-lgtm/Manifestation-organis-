import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createSlogan, deleteSlogan, listSlogans, setSloganStatus } from "../../lib/api";
import { SLOGAN_IDEAS } from "../../lib/slogans";
import type { MemberRow, SloganRow, ThemeId } from "../../lib/types";

type Props = { eventId: string; theme: ThemeId; members: MemberRow[]; userId: string; canEdit: boolean };

export function SlogansTab({ eventId, theme, members, userId, canEdit }: Props) {
  const [slogans, setSlogans] = useState<SloganRow[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSlogans(await listSlogans(eventId));
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

  async function add(value: string) {
    // Les organisateurs publient directement un slogan validé, les membres le proposent.
    await run(() => createSlogan(eventId, value.trim(), userId, canEdit ? "valide" : "propose"));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    await add(text);
    setText("");
  }

  const nameOf = (id: string) => {
    const m = members.find((x) => x.user_id === id);
    return m ? m.profiles.full_name || m.profiles.email : "Inconnu";
  };
  const validated = slogans.filter((s) => s.status === "valide");
  const proposed = slogans.filter((s) => s.status === "propose");
  const existing = new Set(slogans.map((s) => s.text.toLowerCase()));
  const ideas = SLOGAN_IDEAS[theme].filter((i) => !existing.has(i.toLowerCase()));

  return (
    <div className="stack">
      <form onSubmit={submit} className="row">
        <input
          className="grow"
          placeholder="Proposer un slogan (140 caractères maximum)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={140}
          required
        />
        <button className="btn btn-primary">{canEdit ? "Ajouter" : "Proposer"}</button>
      </form>

      {ideas.length > 0 && (
        <section>
          <h3>Idées pour démarrer</h3>
          <div className="chips">
            {ideas.map((idea) => (
              <button key={idea} className="chip" onClick={() => add(idea)}>
                + {idea}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3>Slogans validés ({validated.length})</h3>
        {validated.length === 0 && <p className="muted">Aucun slogan validé pour l'instant.</p>}
        <ul className="list">
          {validated.map((s) => (
            <li key={s.id} className="list-row">
              <strong className="slogan">« {s.text} »</strong>
              <div className="row">
                <span className="muted small">{nameOf(s.author_id)}</span>
                {canEdit && (
                  <>
                    <button className="btn btn-ghost" onClick={() => run(() => setSloganStatus(s.id, "propose"))}>
                      Retirer
                    </button>
                    <button className="btn btn-ghost" onClick={() => run(() => deleteSlogan(s.id))}>
                      Supprimer
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {proposed.length > 0 && (
        <section>
          <h3>Propositions ({proposed.length})</h3>
          <ul className="list">
            {proposed.map((s) => (
              <li key={s.id} className="list-row">
                <span>« {s.text} »</span>
                <div className="row">
                  <span className="muted small">{nameOf(s.author_id)}</span>
                  {canEdit && (
                    <button className="btn" onClick={() => run(() => setSloganStatus(s.id, "valide"))}>
                      Valider
                    </button>
                  )}
                  {(canEdit || s.author_id === userId) && (
                    <button className="btn btn-ghost" onClick={() => run(() => deleteSlogan(s.id))}>
                      Supprimer
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
