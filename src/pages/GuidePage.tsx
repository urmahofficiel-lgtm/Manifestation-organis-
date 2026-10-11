import { Link } from "react-router-dom";

// Informations générales, pas un avis juridique. Sources : article L211-2 du Code de la sécurité intérieure,
// article 431-9 du Code pénal, formulaires de déclaration des préfectures.
export function GuidePage() {
  return (
    <article className="prose">
      <h1>Guide légal : déclarer une manifestation en France</h1>
      <p className="notice notice-warn">
        Ces informations sont générales et ne remplacent pas un conseil juridique. Les règles peuvent évoluer et
        varier selon la commune : confirmez toujours auprès de votre mairie ou de votre préfecture.
      </p>

      <h2>En bref</h2>
      <ul>
        <li>Une manifestation sur la voie publique doit faire l'objet d'une <strong>déclaration préalable</strong>.</li>
        <li>
          Elle se fait <strong>au moins 3 jours francs</strong> et <strong>au plus 15 jours francs</strong> avant la
          date de la manifestation.
        </li>
        <li>L'autorité qui reçoit la déclaration doit en délivrer immédiatement un <strong>récépissé</strong>.</li>
      </ul>

      <h2>Ce que veut dire « jours francs »</h2>
      <p>
        Les jours francs ne comptent ni le jour du dépôt de la déclaration, ni le jour de la manifestation. Pour une
        manifestation un lundi 10 novembre, le dernier jour pour déposer est le jeudi 6 novembre (les jours 7, 8 et 9
        forment trois jours francs), et le premier jour possible est le samedi 25 octobre. L'onglet « Démarches » de
        chaque événement calcule ces dates pour vous.
      </p>

      <h2>À qui déclarer ?</h2>
      <ul>
        <li>À la <strong>mairie</strong> de la commune (ou des communes) concernée par le parcours ou le lieu.</li>
        <li>À <strong>Paris</strong> : à la préfecture de police.</li>
        <li>
          Dans les communes où la police est <strong>étatisée</strong> : au représentant de l'État dans le département
          (préfecture ou sous-préfecture).
        </li>
      </ul>

      <h2>Ce que la déclaration doit contenir</h2>
      <ul>
        <li>Les <strong>noms, prénoms et domiciles</strong> des organisateurs.</li>
        <li>La <strong>signature d'au moins l'un des organisateurs</strong>.</li>
        <li>Le <strong>but</strong> de la manifestation, le <strong>lieu</strong>, la <strong>date</strong> et l'<strong>heure</strong> du rassemblement.</li>
        <li>Le cas échéant, l'<strong>itinéraire</strong> projeté.</li>
      </ul>
      <p>
        Le régime est le même que vous soyez une personne seule, une association, un syndicat ou un collectif. Certains
        formulaires de préfecture distinguent toutefois les déclarants qui ont la personnalité morale (association
        déclarée, syndicat) de ceux qui n'en ont pas : renseignez-vous auprès de votre préfecture.
      </p>

      <h2>Sans déclaration</h2>
      <p>
        Organiser une manifestation sur la voie publique sans déclaration préalable est un délit (article 431-9 du
        Code pénal). Les formulaires des préfectures indiquent une peine pouvant aller jusqu'à six mois
        d'emprisonnement et 7 500 euros d'amende pour les organisateurs.
      </p>

      <h2>Interdiction possible</h2>
      <p>
        L'autorité peut interdire une manifestation si elle estime qu'elle risque de troubler l'ordre public. Une
        interdiction peut être contestée devant le tribunal administratif. Une déclaration déposée en dehors des
        délais n'entraîne pas automatiquement une interdiction, mais elle vous expose à des difficultés : ne comptez pas dessus.
      </p>

      <h2>Avant le jour J</h2>
      <ul>
        <li>Désignez un <strong>responsable</strong> et un <strong>service d'ordre</strong>.</li>
        <li>Prévoyez des <strong>secours</strong> (trousse, personne formée, numéros d'urgence).</li>
        <li>Préparez l'<strong>eau</strong>, la <strong>sono</strong> et le matériel, et notez qui les garde.</li>
        <li>Prévenez toute l'équipe de l'heure et du lieu de rendez-vous (annonces et discussion de l'événement).</li>
      </ul>

      <h2>Sources</h2>
      <ul className="small">
        <li>
          <a href="https://www.marne.gouv.fr/index.php/contenu/telechargement/35468/220362/file/Déclaration%20de%20manifestation%20revendicative.pdf" target="_blank" rel="noreferrer">
            Formulaire de déclaration de manifestation revendicative (préfecture de la Marne)
          </a>
        </li>
        <li>
          <a href="https://www.doubs.gouv.fr/index.php/contenu/telechargement/40350/273302/file/Déclaration%20de%20manifestation.pdf" target="_blank" rel="noreferrer">
            Formulaire de déclaration de manifestation (préfecture du Doubs)
          </a>
        </li>
        <li>
          <a href="https://melun.tribunal-administratif.fr/Media/mediatheque-ta-melun/documents/2025/decembre/decision-n-2517772-du-9-decembre-2025" target="_blank" rel="noreferrer">
            Décision du tribunal administratif de Melun du 9 décembre 2025 (rappel de l'article L211-2)
          </a>
        </li>
        <li>
          <a href="https://analyses-propositions.cgt.fr/sites/analyses-propositions.cgt.fr/files/2020-09/Note%20R%C3%A9gime%20juridique%20libert%C3%A9%20de%20manifester.pdf" target="_blank" rel="noreferrer">
            Note sur le régime juridique de la liberté de manifester
          </a>
        </li>
      </ul>

      <p>
        <Link to="/connexion?mode=inscription" className="btn btn-primary">
          Créer un compte et organiser
        </Link>
      </p>
    </article>
  );
}
