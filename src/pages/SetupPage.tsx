export function SetupPage() {
  return (
    <div className="app">
      <main className="container narrow">
        <h1>Configuration requise</h1>
        <p>
          L'application a besoin d'un projet Supabase. Créez un fichier <code>.env.local</code> à la
          racine du projet, en copiant <code>.env.example</code>, puis renseignez{" "}
          <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
        <p>Relancez ensuite <code>npm run dev</code>. Le guide complet est dans le README.</p>
      </main>
    </div>
  );
}
