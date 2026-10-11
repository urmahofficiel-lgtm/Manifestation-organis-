// Mémorise, dans ce navigateur, la dernière fois que la discussion d'un événement a été ouverte,
// pour signaler les messages non lus. Le stockage peut être indisponible (navigation privée) : on l'ignore alors.
const key = (eventId: string) => `discussion-vue:${eventId}`;

export function getLastSeen(eventId: string): string | null {
  try {
    return window.localStorage.getItem(key(eventId));
  } catch {
    return null;
  }
}

export function markSeen(eventId: string): void {
  try {
    window.localStorage.setItem(key(eventId), new Date().toISOString());
  } catch {
    // stockage indisponible : pas de suivi des non-lus
  }
}
