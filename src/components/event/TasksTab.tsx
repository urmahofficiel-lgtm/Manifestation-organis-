import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createTask, deleteTask, listTasks, setTaskDone } from "../../lib/api";
import type { MemberRow, TaskRow } from "../../lib/types";

type Props = { eventId: string; members: MemberRow[]; userId: string; canEdit: boolean };

export function TasksTab({ eventId, members, userId, canEdit }: Props) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTasks(await listTasks(eventId));
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
      await createTask(eventId, title.trim(), assignee || null, userId);
      setTitle("");
      setAssignee("");
    });
  }

  const nameOf = (id: string | null) => {
    if (!id) return "Non attribuée";
    const m = members.find((x) => x.user_id === id);
    return m ? m.profiles.full_name || m.profiles.email : "Inconnu";
  };

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="stack">
      <form onSubmit={add} className="row">
        <input
          placeholder="Nouvelle tâche (ex. : appeler le loueur de sono)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          className="grow"
        />
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">Non attribuée</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.profiles.full_name || m.profiles.email}
            </option>
          ))}
        </select>
        <button className="btn btn-primary">Ajouter</button>
      </form>

      <TaskList
        title={`À faire (${open.length})`}
        tasks={open}
        nameOf={nameOf}
        onToggle={(t) => run(() => setTaskDone(t.id, true))}
        onDelete={canEdit ? (t) => run(() => deleteTask(t.id)) : undefined}
      />
      {done.length > 0 && (
        <TaskList
          title={`Faites (${done.length})`}
          tasks={done}
          nameOf={nameOf}
          onToggle={(t) => run(() => setTaskDone(t.id, false))}
          onDelete={canEdit ? (t) => run(() => deleteTask(t.id)) : undefined}
        />
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}

function TaskList({
  title,
  tasks,
  nameOf,
  onToggle,
  onDelete,
}: {
  title: string;
  tasks: TaskRow[];
  nameOf: (id: string | null) => string;
  onToggle: (t: TaskRow) => void;
  onDelete?: (t: TaskRow) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <section>
      <h3>{title}</h3>
      <ul className="list">
        {tasks.map((t) => (
          <li key={t.id} className="list-row">
            <label className="row">
              <input type="checkbox" checked={t.done} onChange={() => onToggle(t)} />
              <span className={t.done ? "done" : ""}>{t.title}</span>
            </label>
            <div className="row">
              <span className="muted small">{nameOf(t.assignee_id)}</span>
              {onDelete && (
                <button className="btn btn-ghost" onClick={() => onDelete(t)}>
                  Supprimer
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
