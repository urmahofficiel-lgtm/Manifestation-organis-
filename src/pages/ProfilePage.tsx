import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getMyDeclarant, getMyProfile, saveMyDeclarant } from "../lib/api";
import { searchAddress, type AddressHit } from "../lib/address";
import { useAuth } from "../lib/auth";
import { ACCOUNT_TYPES, type MyProfile } from "../lib/types";

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<AddressHit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!user) return;
    getMyProfile(user.id).then(setProfile).catch(() => setProfile(null));
    getMyDeclarant(user.id)
      .then((d) => {
        if (d) {
          setFirstName(d.first_name);
          setLastName(d.last_name);
          setAddressLine(d.address_line);
          setPostalCode(d.postal_code);
          setCity(d.city);
          setPhone(d.phone);
          setVerified(d.address_verified);
        }
        setLoaded(true);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Chargement impossible."));
  }, [user]);

  async function lookup(value: string) {
    setQuery(value);
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    try {
      setHits(await searchAddress(value, controller.signal));
    } catch {
      // requête annulée ou service indisponible : on garde la saisie manuelle
    }
  }

  function choose(hit: AddressHit) {
    setAddressLine(hit.street);
    setPostalCode(hit.postcode);
    setCity(hit.city);
    setVerified(true);
    setQuery("");
    setHits([]);
    setSaved(false);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSaved(false);
    try {
      await saveMyDeclarant({
        user_id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim().toUpperCase(),
        address_line: addressLine.trim(),
        postal_code: postalCode.trim(),
        city: city.trim(),
        phone: phone.trim(),
        address_verified: verified,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
  }

  const typeLabel = ACCOUNT_TYPES.find((t) => t.id === profile?.account_type)?.label;

  return (
    <div className="narrow" style={{ maxWidth: 680 }}>
      <h1>Mon profil</h1>

      <section className="card">
        <h2>Mon compte</h2>
        <dl className="facts">
          <dt>Nom</dt>
          <dd>{profile?.full_name || "—"}</dd>
          <dt>E-mail</dt>
          <dd>{user?.email}</dd>
          <dt>Type</dt>
          <dd>{typeLabel ?? "—"}</dd>
          {profile?.organization_name && (
            <>
              <dt>Organisation</dt>
              <dd>{profile.organization_name}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="card">
        <h2>Identité de déclarant</h2>
        <p className="small">
          La loi demande les <strong>noms, prénoms et domiciles</strong> des organisateurs qui déclarent une manifestation.
          Ces informations servent uniquement à préparer la lettre de déclaration.{" "}
          <strong>Vous seul les voyez</strong> : les organisateurs d'une manif y ont accès uniquement si vous vous
          engagez comme déclarant pour cette manif. Aucune date de naissance n'est demandée, car la loi ne l'exige pas.
        </p>
        {!loaded ? (
          <p className="muted">Chargement…</p>
        ) : (
          <form onSubmit={save} className="form">
            <div className="grid-2">
              <label>
                Prénom
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} required autoComplete="given-name" />
              </label>
              <label>
                Nom
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} required autoComplete="family-name" />
              </label>
            </div>

            <label>
              Rechercher mon adresse
              <input
                value={query}
                onChange={(e) => lookup(e.target.value)}
                placeholder="Tapez votre adresse, puis choisissez-la dans la liste"
                autoComplete="off"
              />
              <span className="hint">Recherche dans la Base Adresse Nationale : une adresse choisie dans la liste est vérifiée.</span>
            </label>
            {hits.length > 0 && (
              <ul className="list suggestions">
                {hits.map((h) => (
                  <li key={h.label}>
                    <button type="button" className="suggestion" onClick={() => choose(h)}>
                      {h.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <label>
              Adresse
              <input
                value={addressLine}
                onChange={(e) => {
                  setAddressLine(e.target.value);
                  setVerified(false);
                }}
                maxLength={200}
                required
                autoComplete="street-address"
              />
            </label>
            <div className="grid-2">
              <label>
                Code postal
                <input
                  value={postalCode}
                  onChange={(e) => {
                    setPostalCode(e.target.value);
                    setVerified(false);
                  }}
                  pattern="[0-9]{5}"
                  inputMode="numeric"
                  required
                />
              </label>
              <label>
                Ville
                <input
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setVerified(false);
                  }}
                  maxLength={100}
                  required
                />
              </label>
            </div>
            <p className={verified ? "success small" : "muted small"}>
              {verified ? "✓ Adresse vérifiée dans la Base Adresse Nationale" : "Adresse non vérifiée : choisissez-la dans la liste ci-dessus."}
            </p>
            <label>
              Téléphone (joignable le jour de la manif)
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} autoComplete="tel" />
            </label>

            {error && <p className="error">{error}</p>}
            <div className="row">
              <button className="btn btn-primary">Enregistrer</button>
              {saved && <span className="success">Enregistré.</span>}
            </div>
          </form>
        )}
      </section>

      <div className="row wrap">
        <Link to="/guide" className="btn">
          Guide légal
        </Link>
        <button className="btn btn-ghost" onClick={() => signOut()}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
