import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Sans configuration, l'application affiche une page d'aide au lieu de planter.
export const isSupabaseConfigured = Boolean(url && anonKey);

// Toutes les tables de l'application vivent dans le schéma « manifestation »
// (le projet Supabase est partagé avec d'autres applications).
export const supabase = createClient(url ?? "http://localhost", anonKey ?? "non-configure", {
  db: { schema: "manifestation" },
});
