import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ACCOUNT_TYPES, type AccountType } from "../lib/types";

// N'autorise que les chemins internes (évite les redirections vers un site externe).
export function safeRedirect(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/evenements";
}

export function LoginPage() {
  const { user, signIn, signUp, resendConfirmation } = useAuth();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"connexion" | "inscription">(
    params.get("mode") === "inscription" ? "inscription" : "connexion",
  );
  const [accountType, setAccountType] = useState<AccountType>("individu");
  const [organizationName, setOrganizationName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  // Erreur renvoyée dans l'adresse par le lien de confirmation (lien expiré ou déjà utilisé)
  const [linkError] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = hash.get("error_code") ?? new URLSearchParams(window.location.search).get("error_code");
    if (!code) return null;
    return code === "otp_expired"
      ? "Ce lien de confirmation a expiré ou a déjà été utilisé. Renvoyez-en un nouveau ci-dessous."
      : "Le lien de confirmation n'a pas fonctionné. Renvoyez-en un nouveau ci-dessous.";
  });

  if (user) return <Navigate to={safeRedirect(params.get("suite"))} replace />;

  const needsOrganization = accountType !== "individu";
  const typeInfo = ACCOUNT_TYPES.find((t) => t.id === accountType);

  async function resend() {
    if (!email) {
      setError("Indiquez votre adresse e-mail ci-dessus, puis renvoyez le lien.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await resendConfirmation(email);
      setInfo("Un nouvel e-mail de confirmation vient d'être envoyé. Pensez à regarder dans les spams.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setNeedsConfirmation(false);
    setBusy(true);
    try {
      if (mode === "connexion") {
        await signIn(email, password);
      } else {
        await signUp({
          email,
          password,
          fullName: fullName.trim(),
          accountType,
          organizationName: needsOrganization ? organizationName.trim() : "",
        });
        setInfo("Compte créé. Ouvrez l'e-mail de confirmation et cliquez sur le lien : vous reviendrez ici, connecté.");
        setNeedsConfirmation(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue.";
      setError(message);
      if (message.includes("pas encore confirmée")) setNeedsConfirmation(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card narrow">
      <h1>{mode === "connexion" ? "Connexion" : "Créer un compte"}</h1>
      <form onSubmit={submit} className="form">
        {mode === "inscription" && (
          <>
            <fieldset className="choice">
              <legend>Vous êtes…</legend>
              {ACCOUNT_TYPES.map((t) => (
                <label key={t.id} className={accountType === t.id ? "choice-item active" : "choice-item"}>
                  <input
                    type="radio"
                    name="account_type"
                    value={t.id}
                    checked={accountType === t.id}
                    onChange={() => setAccountType(t.id)}
                  />
                  <span>{t.label}</span>
                </label>
              ))}
              {typeInfo && <p className="muted small">{typeInfo.hint}</p>}
            </fieldset>

            {needsOrganization && (
              <label>
                {accountType === "association"
                  ? "Nom de l'association"
                  : accountType === "syndicat"
                    ? "Nom du syndicat ou de la section"
                    : "Nom du collectif"}
                <input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required />
              </label>
            )}

            <label>
              {needsOrganization ? "Votre nom et prénom (représentant)" : "Nom et prénom"}
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </label>
          </>
        )}
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>
        {mode === "inscription" && (
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
            <span className="small">
              J'accepte que mon nom et mon e-mail soient visibles des membres des événements auxquels je participe.
            </span>
          </label>
        )}
        {linkError && !error && !info && <p className="error">{linkError}</p>}
        {error && <p className="error">{error}</p>}
        {info && <p className="success">{info}</p>}
        {(needsConfirmation || linkError) && (
          <button type="button" className="btn" onClick={resend} disabled={busy}>
            Renvoyer l'e-mail de confirmation
          </button>
        )}
        <button className="btn btn-primary" disabled={busy}>
          {mode === "connexion" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>
      <button
        className="btn btn-link"
        onClick={() => {
          setMode(mode === "connexion" ? "inscription" : "connexion");
          setError(null);
          setInfo(null);
        }}
      >
        {mode === "connexion" ? "Pas de compte ? En créer un" : "Déjà un compte ? Se connecter"}
      </button>
    </div>
  );
}
