import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { AccountType } from "./types";

export type SignUpInput = {
  email: string;
  password: string;
  fullName: string;
  accountType: AccountType;
  organizationName: string;
};

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
};

// Après confirmation de l'e-mail, Supabase doit revenir sur Agora (et non sur l'autre application du projet).
// Cette adresse doit figurer dans les « Redirect URLs » du projet Supabase.
function confirmationRedirect(): string {
  return `${window.location.origin}/connexion`;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) ensureProfile(next.user);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    user: session?.user ?? null,
    session,
    loading,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(traduireErreur(error.message));
    },
    async signUp({ email, password, fullName, accountType, organizationName }) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: confirmationRedirect(),
          data: { full_name: fullName, account_type: accountType, organization_name: organizationName },
        },
      });
      if (error) throw new Error(traduireErreur(error.message));
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    async resendConfirmation(email) {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: confirmationRedirect() },
      });
      if (error) throw new Error(traduireErreur(error.message));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}

// Crée le profil au premier passage, sans jamais écraser un nom déjà renseigné.
async function ensureProfile(user: User) {
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      full_name: (user.user_metadata?.full_name as string | undefined) ?? "",
      account_type: (user.user_metadata?.account_type as string | undefined) ?? "individu",
      organization_name: (user.user_metadata?.organization_name as string | undefined) ?? "",
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
}

function traduireErreur(message: string): string {
  if (message.includes("Invalid login credentials")) return "E-mail ou mot de passe incorrect.";
  if (message.includes("Email not confirmed"))
    return "Votre adresse e-mail n'est pas encore confirmée. Cliquez sur le lien reçu par e-mail, ou renvoyez-le ci-dessous.";
  if (message.includes("security purposes") || message.includes("rate limit"))
    return "Trop de demandes en peu de temps. Patientez une minute avant de réessayer.";
  if (message.includes("already registered")) return "Un compte existe déjà avec cet e-mail.";
  if (message.includes("Password should be at least")) return "Le mot de passe doit contenir au moins 6 caractères.";
  return message;
}
