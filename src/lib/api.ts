// Toutes les requêtes vers Supabase passent par ce fichier.
// Les droits sont vérifiés par la base (RLS), pas seulement par l'interface.
import { supabase } from "./supabase";
import type {
  AnnouncementRow,
  DeclarationRow,
  EventRow,
  EventSummary,
  InvitePreview,
  InviteRow,
  MaterialRow,
  MemberRow,
  MessageRow,
  MyProfile,
  MyTask,
  PublicEvent,
  Role,
  SloganRow,
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

export type EventInput = Omit<EventRow, "id" | "created_by" | "created_at" | "is_public">;

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

// Profil de l'utilisateur connecté

export async function getMyProfile(userId: string): Promise<MyProfile | null> {
  return unwrap(
    await supabase
      .from("profiles")
      .select("id, email, full_name, account_type, organization_name")
      .eq("id", userId)
      .maybeSingle(),
  );
}

// Slogans

export async function listSlogans(eventId: string): Promise<SloganRow[]> {
  return unwrap(
    await supabase.from("slogans").select("*").eq("event_id", eventId).order("created_at"),
  );
}

export async function createSlogan(
  eventId: string,
  text: string,
  authorId: string,
  status: "propose" | "valide",
): Promise<void> {
  unwrap(await supabase.from("slogans").insert({ event_id: eventId, text, author_id: authorId, status }));
}

export async function setSloganStatus(id: string, status: "propose" | "valide"): Promise<void> {
  unwrap(await supabase.from("slogans").update({ status }).eq("id", id));
}

export async function deleteSlogan(id: string): Promise<void> {
  unwrap(await supabase.from("slogans").delete().eq("id", id));
}

// Discussion

export async function listMessages(eventId: string): Promise<MessageRow[]> {
  const rows = unwrap(
    await supabase
      .from("messages")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(200),
  ) as MessageRow[];
  return rows.reverse();
}

export async function createMessage(eventId: string, body: string, authorId: string): Promise<void> {
  unwrap(await supabase.from("messages").insert({ event_id: eventId, body, author_id: authorId }));
}

export async function deleteMessage(id: string): Promise<void> {
  unwrap(await supabase.from("messages").delete().eq("id", id));
}

// Invitations

export async function listInvites(eventId: string): Promise<InviteRow[]> {
  return unwrap(
    await supabase
      .from("invites")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
  );
}

export async function createInvite(
  eventId: string,
  role: "organizer" | "member",
  userId: string,
  maxUses: number | null,
): Promise<void> {
  unwrap(
    await supabase
      .from("invites")
      .insert({ event_id: eventId, role, created_by: userId, max_uses: maxUses }),
  );
}

export async function revokeInvite(id: string): Promise<void> {
  unwrap(await supabase.from("invites").update({ revoked: true }).eq("id", id));
}

export async function deleteInvite(id: string): Promise<void> {
  unwrap(await supabase.from("invites").delete().eq("id", id));
}

export async function previewInvite(code: string): Promise<InvitePreview | null> {
  const rows = unwrap(await supabase.rpc("preview_invite", { invite_code: code })) as InvitePreview[] | null;
  return rows && rows.length > 0 ? rows[0] : null;
}

export async function joinByCode(code: string): Promise<string> {
  return unwrap(await supabase.rpc("join_event_by_code", { invite_code: code })) as string;
}

// Tableau de bord et résumé d'un événement

async function countRows(
  table: string,
  filter: (q: ReturnType<ReturnType<typeof supabase.from>["select"]>) => typeof q,
): Promise<number> {
  const { count, error } = await filter(supabase.from(table).select("*", { count: "exact", head: true }));
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getEventSummary(
  eventId: string,
  userId: string,
  lastSeen: string | null,
): Promise<EventSummary> {
  const byEvent = (q: ReturnType<ReturnType<typeof supabase.from>["select"]>) => q.eq("event_id", eventId);
  const [members, tasksTotal, tasksDone, materials, slogansValid, slogansProposed, messages, unread, announcements, declaration] =
    await Promise.all([
      countRows("event_members", byEvent),
      countRows("tasks", byEvent),
      countRows("tasks", (q) => byEvent(q).eq("done", true)),
      countRows("materials", byEvent),
      countRows("slogans", (q) => byEvent(q).eq("status", "valide")),
      countRows("slogans", (q) => byEvent(q).eq("status", "propose")),
      countRows("messages", byEvent),
      countRows("messages", (q) => {
        const base = byEvent(q).neq("author_id", userId);
        return lastSeen ? base.gt("created_at", lastSeen) : base;
      }),
      countRows("announcements", byEvent),
      getDeclaration(eventId),
    ]);
  return {
    members,
    tasksTotal,
    tasksDone,
    materials,
    slogansValid,
    slogansProposed,
    messages,
    unread,
    announcements,
    declarationSubmitted: Boolean(declaration?.submitted_at),
  };
}

export async function listMyOpenTasks(userId: string): Promise<MyTask[]> {
  return unwrap(
    await supabase
      .from("tasks")
      .select("id, title, done, event_id, events(title, starts_at)")
      .eq("assignee_id", userId)
      .eq("done", false)
      .order("created_at"),
  ) as unknown as MyTask[];
}

// Page publique

export async function setEventPublic(id: string, isPublic: boolean): Promise<void> {
  unwrap(await supabase.from("events").update({ is_public: isPublic }).eq("id", id));
}

export async function getPublicEvent(id: string): Promise<PublicEvent | null> {
  const rows = unwrap(await supabase.rpc("get_public_event", { ev: id })) as PublicEvent[] | null;
  return rows && rows.length > 0 ? rows[0] : null;
}

export async function getPublicSlogans(id: string): Promise<string[]> {
  const rows = unwrap(await supabase.rpc("get_public_slogans", { ev: id })) as { text: string }[] | null;
  return (rows ?? []).map((r) => r.text);
}
