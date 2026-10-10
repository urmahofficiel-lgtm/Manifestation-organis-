import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function LoginPage() {
  const { user, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "connexion") {
        await signIn(email, password);
      } else {
        await signUp(email, password, fullName);
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
          <label>
            Nom complet
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
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
