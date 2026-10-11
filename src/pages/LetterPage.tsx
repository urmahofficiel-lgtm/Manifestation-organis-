import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDeclaration, getDeclarationIdentities, getEvent, listMembers, listSignatories, saveDeclaration } from "../lib/api";
import { extractPostcode, suggestAuthority } from "../lib/address";
import { cityFromAddress, declarationChecklist } from "../lib/declarationCheck";
import { useAuth } from "../lib/auth";
import { EventMap, MapLegend } from "../components/EventMap";
import { SignaturePad } from "../components/SignaturePad";
import type { Declarant, DeclarationRow, EventRow, MemberRow } from "../lib/types";

const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// Lettre de déclaration conforme à l'article L211-2 du Code de la sécurité intérieure, à imprimer ou enregistrer en PDF.
export function LetterPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [identities, setIdentities] = useState<Declarant[]>([]);
  const [signatoryIds, setSignatoryIds] = useState<string[]>([]);
  const [declaration, setDeclaration] = useState<DeclarationRow | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [certified, setCertified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getEvent(id), listMembers(id), getDeclarationIdentities(id), listSignatories(id), getDeclaration(id)])
      .then(([ev, mem, ids, sigs, decl]) => {
        setEvent(ev);
        setMembers(mem);
        setIdentities(ids);
        setSignatoryIds(sigs.map((s) => s.user_id));
        setDeclaration(decl);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Impossible de préparer la lettre."));
  }, [id]);

  if (error) {
    return (
      <p className="error">
        {error} <Link to={`/evenements/${id}/demarches`}>Retour aux démarches</Link>
      </p>
    );
  }
  if (!event || !user) return <p className="muted">Préparation de la lettre…</p>;

  const missing = declarationChecklist(event, signatoryIds.length).filter((c) => !c.ok);
  const authority =
    declaration?.authority || suggestAuthority(extractPostcode(event.address), cityFromAddress(event.address)) || "Madame, Monsieur le Maire";
  const first = identities[0];
  const serviceOrdre = members.filter((m) => m.field_role === "service_ordre").length;
  const secours = members.filter((m) => m.field_role === "secours").length;
  const isStatic = event.route.length < 2 && !event.route_description.trim();
  const meIsSignatory = identities.some((d) => d.user_id === user.id);
  const incomplete = identities.filter((d) => !d.first_name || !d.last_name || !d.address_line || !d.city);

  async function print() {
    try {
      await saveDeclaration(id, { letter_generated_at: new Date().toISOString() });
    } catch {
      // l'impression reste possible même si le suivi n'a pas pu être enregistré
    }
    window.print();
  }

  return (
    <>
      <div className="no-print stack">
        <Link to={`/evenements/${id}/demarches`} className="back-link">
          ← Démarches
        </Link>
        <h1>Lettre de déclaration</h1>
        {missing.length > 0 && (
          <div className="notice notice-error small">
            Éléments manquants : {missing.map((m) => m.label).join(", ")}. Complétez-les avant de déposer la déclaration.
          </div>
        )}
        {incomplete.length > 0 && (
          <div className="notice notice-error small">Un déclarant n'a pas complété son identité dans son profil.</div>
        )}
        {meIsSignatory && (
          <section className="card">
            <h3>Votre signature</h3>
            <p className="small muted">
              Signez au doigt ou à la souris, ou laissez vide pour signer à la main après impression. La signature n'est pas
              enregistrée : elle sert uniquement à cette impression.
            </p>
            <SignaturePad onChange={setSignature} />
          </section>
        )}
        <label className="check card flat">
          <input type="checkbox" checked={certified} onChange={(e) => setCertified(e.target.checked)} />
          <span>
            Je certifie l'exactitude des informations de cette déclaration. Je sais qu'une déclaration incomplète ou inexacte
            est un délit (article 431-9 du Code pénal).
          </span>
        </label>
        <div className="row wrap">
          <button className="btn btn-primary btn-lg" onClick={print} disabled={!certified}>
            Imprimer ou enregistrer en PDF
          </button>
          <span className="small muted">Dans la fenêtre d'impression, choisissez « Enregistrer au format PDF » pour l'envoyer par e-mail.</span>
        </div>
        <p className="small muted">Aperçu :</p>
      </div>

      <article className="letter">
        <header className="letter-head">
          <div>
            {identities.map((d) => (
              <p key={d.user_id}>
                <strong>
                  {d.first_name} {d.last_name.toUpperCase()}
                </strong>
                <br />
                {d.address_line}
                <br />
                {d.postal_code} {d.city}
                {d.phone && (
                  <>
                    <br />
                    Tél. : {d.phone}
                  </>
                )}
              </p>
            ))}
            {event.organizer_name && <p>Pour : {event.organizer_name}</p>}
          </div>
          <div className="letter-to">
            <p>
              À l'attention de :<br />
              <strong>{authority}</strong>
            </p>
            <p>
              {first?.city ? `Fait à ${first.city}, le ` : "Le "}
              {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </header>

        <p>
          <strong>Objet : déclaration préalable de manifestation sur la voie publique</strong>
        </p>
        <p>Madame, Monsieur,</p>
        <p>
          Conformément aux articles L211-1 et L211-2 du Code de la sécurité intérieure, nous avons l'honneur de vous déclarer
          la manifestation décrite ci-dessous.
        </p>

        <table className="letter-table">
          <tbody>
            <tr><th>Objet</th><td>{event.purpose || "—"}</td></tr>
            <tr><th>Date</th><td>{longDate(event.starts_at)}</td></tr>
            <tr>
              <th>Rassemblement</th>
              <td>
                à {time(event.starts_at)}, {event.place_name}
                {event.address && `, ${event.address}`}
              </td>
            </tr>
            {isStatic ? (
              <tr><th>Forme</th><td>Rassemblement statique, sans cortège</td></tr>
            ) : (
              <>
                <tr><th>Départ du cortège</th><td>{time(event.departure_at) || "—"}</td></tr>
                <tr>
                  <th>Itinéraire</th>
                  <td>
                    {event.route_description || "Voir le plan en annexe"}
                    {event.route.length > 1 && event.route_description && " (plan en annexe)"}
                  </td>
                </tr>
              </>
            )}
            <tr>
              <th>Dispersion</th>
              <td>
                {time(event.dispersal_at) && `à ${time(event.dispersal_at)}, `}
                {event.dispersal_place || "—"}
              </td>
            </tr>
            {event.municipalities && <tr><th>Communes concernées</th><td>{event.municipalities}</td></tr>}
            {event.expected_count !== null && <tr><th>Participants attendus</th><td>environ {event.expected_count}</td></tr>}
            {(serviceOrdre > 0 || secours > 0) && (
              <tr>
                <th>Encadrement</th>
                <td>
                  {serviceOrdre > 0 && `${serviceOrdre} personne${serviceOrdre > 1 ? "s" : ""} au service d'ordre`}
                  {serviceOrdre > 0 && secours > 0 && ", "}
                  {secours > 0 && `${secours} personne${secours > 1 ? "s" : ""} chargée${secours > 1 ? "s" : ""} des secours`}
                </td>
              </tr>
            )}
            {first && (
              <tr>
                <th>Contact le jour J</th>
                <td>
                  {first.first_name} {first.last_name.toUpperCase()}
                  {first.phone && `, ${first.phone}`}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <p>
          Nous nous engageons à encadrer la manifestation, à appeler les participants au calme et au respect du parcours
          déclaré, et à rester joignables pendant toute sa durée.
        </p>
        <p>Nous vous remercions de bien vouloir nous délivrer le récépissé prévu par l'article L211-2 du Code de la sécurité intérieure.</p>
        <p>Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.</p>

        <div className="letter-signatures">
          {identities.map((d) => (
            <div key={d.user_id} className="letter-signature">
              <p>
                {d.first_name} {d.last_name.toUpperCase()}
              </p>
              {d.user_id === user.id && signature ? (
                <img src={signature} alt={`Signature de ${d.first_name} ${d.last_name}`} />
              ) : (
                <div className="signature-line">Signature</div>
              )}
            </div>
          ))}
        </div>

        {(event.route.length > 1 || event.pois.length > 0 || event.lat !== null) && (
          <section className="letter-annex">
            <h2>Annexe : plan</h2>
            <EventMap lat={event.lat} lng={event.lng} route={event.route} pois={event.pois} height={420} />
            <MapLegend showRoute={event.route.length > 1} />
          </section>
        )}
      </article>
    </>
  );
}
