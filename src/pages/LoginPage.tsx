import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ACCOUNT_TYPES, type AccountType } from "../lib/types";

// N'autorise que les chemins internes (évite les redirections vers un site externe).
export function safeRedirect(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/evenements";
}

export function LoginPage() {
  const { user, signIn, signUp } = useAuth();
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

  if (user) return <Navigate to={safeRedirect(params.get("suite"))} replace />;

  const needsOrganization = accountType !== "individu";
  const typeInfo = ACCOUNT_TYPES.find((t) => t.id === accountType);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
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
        setInfo("Compte créé. Si la confirmation par e-mail est activée, vérifiez votre boîte mail.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
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
        {error && <p className="error">{error}</p>}
        {info && <p className="success">{info}</p>}
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
