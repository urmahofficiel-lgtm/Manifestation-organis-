// Toutes les requêtes vers Supabase passent par ce fichier.
// Les droits sont vérifiés par la base (RLS), pas seulement par l'interface.
import { supabase } from "./supabase";
import type {
  AnnouncementRow,
  DeclarationRow,
  EventRow,
  MaterialRow,
  MemberRow,
  Role,
  TaskRow,
} from "./types";

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

// Événements

export async function listEvents(): Promise<EventRow[]> {
  return unwrap(
    await supabase.from("events").select("*").order("starts_at", { ascending: true }),
  );
}

export async function getEvent(id: string): Promise<EventRow> {
  return unwrap(await supabase.from("events").select("*").eq("id", id).single());
}

export type EventInput = Omit<EventRow, "id" | "created_by" | "created_at">;

export async function createEvent(input: EventInput, userId: string): Promise<string> {
  // Pas de .select() ici : le créateur devient membre par trigger, et la lecture
  // immédiate peut échouer tant que ce membre n'est pas visible. On récupère l'id ensuite.
  const id = crypto.randomUUID();
  unwrap(await supabase.from("events").insert({ ...input, id, created_by: userId }));
  return id;
}

export async function updateEvent(id: string, input: Partial<EventInput>): Promise<void> {
  unwrap(await supabase.from("events").update(input).eq("id", id));
}

export async function deleteEvent(id: string): Promise<void> {
  unwrap(await supabase.from("events").delete().eq("id", id));
}

// Membres

export async function listMembers(eventId: string): Promise<MemberRow[]> {
  return unwrap(
    await supabase
      .from("event_members")
      .select("event_id, user_id, role, profiles(id, email, full_name)")
      .eq("event_id", eventId),
  ) as unknown as MemberRow[];
}

export async function addMemberByEmail(eventId: string, email: string, role: Role): Promise<void> {
  unwrap(
    await supabase.rpc("add_member_by_email", {
      ev: eventId,
      member_email: email.trim(),
      member_role: role,
    }),
  );
}

export async function updateMemberRole(eventId: string, userId: string, role: Role): Promise<void> {
  unwrap(
    await supabase.from("event_members").update({ role }).eq("event_id", eventId).eq("user_id", userId),
  );
}

export async function removeMember(eventId: string, userId: string): Promise<void> {
  unwrap(await supabase.from("event_members").delete().eq("event_id", eventId).eq("user_id", userId));
}

// Tâches

export async function listTasks(eventId: string): Promise<TaskRow[]> {
  return unwrap(
    await supabase.from("tasks").select("*").eq("event_id", eventId).order("created_at"),
  );
}

export async function createTask(
  eventId: string,
  title: string,
  assigneeId: string | null,
  userId: string,
): Promise<void> {
  unwrap(
    await supabase
      .from("tasks")
      .insert({ event_id: eventId, title, assignee_id: assigneeId, created_by: userId }),
  );
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  unwrap(await supabase.from("tasks").update({ done }).eq("id", id));
}

export async function deleteTask(id: string): Promise<void> {
  unwrap(await supabase.from("tasks").delete().eq("id", id));
}

// Matériel

export async function listMaterials(eventId: string): Promise<MaterialRow[]> {
  return unwrap(
    await supabase.from("materials").select("*").eq("event_id", eventId).order("name"),
  );
}

export async function createMaterial(
  eventId: string,
  input: { name: string; quantity: number; holder_id: string | null; location: string },
): Promise<void> {
  unwrap(await supabase.from("materials").insert({ ...input, event_id: eventId }));
}

export async function updateMaterial(
  id: string,
  input: Partial<Pick<MaterialRow, "holder_id" | "location" | "quantity">>,
): Promise<void> {
  unwrap(await supabase.from("materials").update(input).eq("id", id));
}

export async function deleteMaterial(id: string): Promise<void> {
  unwrap(await supabase.from("materials").delete().eq("id", id));
}

// Annonces

export async function listAnnouncements(eventId: string): Promise<AnnouncementRow[]> {
  return unwrap(
    await supabase
      .from("announcements")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
  );
}

export async function createAnnouncement(eventId: string, body: string, authorId: string): Promise<void> {
  unwrap(await supabase.from("announcements").insert({ event_id: eventId, body, author_id: authorId }));
}

export async function deleteAnnouncement(id: string): Promise<void> {
  unwrap(await supabase.from("announcements").delete().eq("id", id));
}

// Démarches administratives

export async function getDeclaration(eventId: string): Promise<DeclarationRow | null> {
  return unwrap(
    await supabase.from("declarations").select("*").eq("event_id", eventId).maybeSingle(),
  );
}

export async function saveDeclaration(
  eventId: string,
  input: Pick<DeclarationRow, "authority" | "submitted_at" | "reference" | "notes">,
): Promise<void> {
  unwrap(await supabase.from("declarations").upsert({ ...input, event_id: eventId }));
}
