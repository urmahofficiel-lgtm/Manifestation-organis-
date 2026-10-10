# Manifestation Organiser

Un espace commun pour organiser une manifestation : événements et carte, équipe et tâches,
matériel, annonces et démarches administratives. Pensé pour une équipe d'organisateurs qui se
connaît et travaille à plusieurs.

## Fonctionnalités (version 1)

- **Événements** : titre, thème, date et heure, lieu, point de rassemblement placé sur la carte,
  nombre de participants attendus, statut (brouillon, à déclarer, déclaré, confirmé, terminé).
- **Équipe** : ajout d'une personne par e-mail (elle doit avoir un compte), rôles
  propriétaire / organisateur / membre.
- **Tâches** : liste de tâches avec responsable attribué et case « faite ».
- **Matériel** : banderoles, sono, gilets, eau… avec quantité, personne qui le garde et emplacement.
- **Annonces** : messages internes à l'équipe.
- **Démarches** : préfecture, date de dépôt, numéro de récépissé, notes. Un rappel calcule la date
  limite de déclaration (indicatif, voir plus bas).

## Architecture

```
┌──────────────────────────┐        ┌────────────────────────────────────────┐
│  Navigateur (site web)   │        │  Supabase                              │
│                          │  HTTPS │                                        │
│  React + TypeScript      │◀──────▶│  Auth        comptes, sessions         │
│  React Router  (pages)   │  API   │  Postgres    tables + règles RLS       │
│  Leaflet       (carte)   │        │  (pas de serveur à écrire ni à gérer)  │
│  supabase-js   (accès)   │        └────────────────────────────────────────┘
└──────────────────────────┘
          ▲
          │ fichiers statiques
          │
   Hébergement (Vercel, Netlify, ou n'importe quel hébergeur statique)
```

### Pourquoi cette architecture

- **Pas de serveur à maintenir** : le navigateur parle directement à Supabase. Les comptes, la base
  et les droits sont gérés par Supabase.
- **Les droits sont dans la base, pas dans l'interface** : chaque table d'événement a des règles RLS
  (Row Level Security). Un utilisateur ne peut lire ou modifier que les événements dont il est membre,
  même si quelqu'un contourne l'interface.
- **Une seule base de données** pour tout le monde, donc l'équipe voit les mêmes informations en temps réel
  (rafraîchissement manuel pour la v1).

### Modèle de données

| Table            | Rôle                                                              |
|------------------|-------------------------------------------------------------------|
| `profiles`       | Nom et e-mail de chaque compte (créé automatiquement à l'inscription) |
| `events`         | Une manifestation ou un rassemblement                             |
| `event_members`  | Qui fait partie de quel événement, et avec quel rôle              |
| `tasks`          | Tâches attribuées à un membre                                     |
| `materials`      | Matériel, avec la personne qui le garde                           |
| `announcements`  | Annonces internes                                                 |
| `declarations`   | Démarches administratives (une par événement)                     |

Rôles : `owner` (créateur, peut tout faire, supprime l'événement), `organizer` (modifie l'événement,
gère l'équipe et les démarches), `member` (voit tout, crée tâches, matériel et annonces).

### Organisation du code

```
src/
  main.tsx              point d'entrée, providers (routeur, authentification)
  App.tsx               routes et protection des pages
  lib/
    supabase.ts         client Supabase (lit la configuration)
    auth.tsx            état de connexion (inscription, connexion, déconnexion)
    api.ts              toutes les requêtes vers la base, un seul endroit
    types.ts            types et libellés partagés
    declaration.ts      calcul de la date limite de déclaration (+ tests)
  components/           composants réutilisables (carte, formulaire, bandeau de statut…)
  components/event/     onglets d'un événement
  pages/                connexion, liste des événements, détail d'un événement
supabase/migrations/    schéma SQL et règles d'accès (à exécuter dans Supabase)
```

## Lancer le projet en local

### 1. Créer le projet Supabase (une seule fois)

1. Créez un compte sur [supabase.com](https://supabase.com) et un nouveau projet.
2. Ouvrez **SQL Editor**, collez le contenu de `supabase/migrations/0001_init.sql`, puis cliquez sur **Run**.
   Toutes les tables sont créées dans le schéma `manifestation`. Si le projet est partagé avec d'autres applications, ajoutez ce schéma dans **Settings → API → Exposed schemas**.
3. Dans **Project Settings → API**, copiez l'URL du projet et la clé `anon public`.
4. Dans **Authentication → Providers → Email**, activez l'e-mail. Pour tester sans confirmation par
   e-mail, désactivez « Confirm email ».

### 2. Configurer l'application

```bash
cp .env.example .env.local
```

Puis renseignez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `.env.local`.

### 3. Installer et démarrer

```bash
npm install
npm run dev
```

Ouvrez <http://localhost:5173>. Créez un compte, puis un événement.

## Commandes utiles

| Commande           | Effet                                              |
|--------------------|----------------------------------------------------|
| `npm run dev`      | Serveur de développement                           |
| `npm run build`    | Vérifie les types puis génère le site dans `dist/` |
| `npm run preview`  | Teste le build de production                       |
| `npm run typecheck`| Vérifie les types TypeScript                       |
| `npm test`         | Lance les tests unitaires                          |

## Mise en ligne

Le site est statique. Sur Vercel ou Netlify, il suffit de connecter le dépôt GitHub, d'indiquer
`npm run build` comme commande et `dist` comme dossier de sortie, puis d'ajouter les deux variables
`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les paramètres du projet.

## Points à vérifier avant un usage réel

- **Délai de déclaration** : l'application calcule une date limite indicative (trois jours francs avant,
  article L211-1 du Code de la sécurité intérieure). Vérifiez les règles applicables à votre
  manifestation auprès de la préfecture compétente.
- **Données personnelles** : l'application contient des noms, e-mails et lieux de personnes. Ne l'utilisez
  qu'avec un accès restreint, et pensez à un cadre de protection des données (RGPD).
- **Sécurité** : la clé `anon` est publique par conception. La protection repose sur les règles RLS de la
  migration. Ne mettez jamais la clé `service_role` dans le code ou dans `.env.example`.

## Idées pour la suite

- Carte avec plusieurs points (parcours, point de départ, point d'arrivée, points de secours).
- Notifications (e-mail ou messagerie) pour les annonces et les tâches en retard.
- Mise à jour en temps réel (Supabase Realtime).
- Export PDF du plan de l'événement et de la déclaration.
- Application mobile installable (PWA).
