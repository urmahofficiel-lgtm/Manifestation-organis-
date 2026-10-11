import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createEvent, getMyProfile } from "../lib/api";
import { useAuth } from "../lib/auth";
import { EventForm } from "../components/EventForm";
import type { MyProfile } from "../lib/types";

export function NewEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MyProfile | null | undefined>(undefined);

  useEffect(() => {
    if (user) getMyProfile(user.id).then(setProfile).catch(() => setProfile(null));
  }, [user]);

  return (
    <div className="narrow" style={{ maxWidth: 720 }}>
      <Link to="/evenements" className="back-link">
        ← Mes manifs
      </Link>
      <h1>Nouvelle manif</h1>
      <div className="card">
        {profile === undefined ? (
          <p className="muted">Chargement…</p>
        ) : (
          <EventForm
            initial={{ organizer_name: profile?.organization_name || profile?.full_name || "" }}
            submitLabel="Créer la manif"
            onCancel={() => navigate("/evenements")}
            onSubmit={async (input) => {
              if (!user) return;
              const id = await createEvent(input, user.id);
              navigate(`/evenements/${id}`);
            }}
          />
        )}
      </div>
    </div>
  );
}
