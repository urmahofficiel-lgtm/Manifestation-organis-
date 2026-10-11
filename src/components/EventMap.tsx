import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { POI_KINDS, type LatLng, type Poi } from "../lib/types";

type Props = {
  lat: number | null;
  lng: number | null;
  route?: LatLng[];
  pois?: Poi[];
  onPick?: (lat: number, lng: number) => void;
  height?: number;
};

const FRANCE: LatLng = [46.6, 2.5];

// Carte OpenStreetMap : point de rassemblement, parcours (ligne rouge) et repères (secours, eau, dispersion…).
// Un clic appelle onPick quand il est fourni (placement du point ou tracé du parcours).
export function EventMap({ lat, lng, route = [], pois = [], onPick, height = 280 }: Props) {
  const hasPoint = lat !== null && lng !== null;
  const center: LatLng = hasPoint ? [lat, lng] : route[0] ?? FRANCE;
  const hasContent = hasPoint || route.length > 0 || pois.length > 0;

  return (
    <div className="map" style={{ height }}>
      <MapContainer center={center} zoom={hasContent ? 15 : 5} scrollWheelZoom={false} style={{ height: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {route.length > 1 && <Polyline positions={route} pathOptions={{ color: "#e4002b", weight: 6, opacity: 0.85 }} />}
        {route.map((p, i) => (
          <CircleMarker key={`r${i}`} center={p} radius={i === 0 || i === route.length - 1 ? 7 : 4} pathOptions={{ color: "#111", fillColor: "#fff", fillOpacity: 1, weight: 2 }}>
            {(i === 0 || i === route.length - 1) && <Tooltip>{i === 0 ? "Départ" : "Arrivée"}</Tooltip>}
          </CircleMarker>
        ))}
        {hasPoint && (
          <CircleMarker center={[lat, lng]} radius={10} pathOptions={{ color: "#111", fillColor: "#e4002b", fillOpacity: 0.9, weight: 2 }}>
            <Tooltip>Point de rassemblement</Tooltip>
          </CircleMarker>
        )}
        {pois.map((p, i) => {
          const kind = POI_KINDS.find((k) => k.id === p.kind) ?? POI_KINDS[POI_KINDS.length - 1];
          return (
            <CircleMarker key={`p${i}`} center={[p.lat, p.lng]} radius={9} pathOptions={{ color: "#111", fillColor: kind.color, fillOpacity: 0.95, weight: 2 }}>
              <Tooltip>{p.label || kind.label}</Tooltip>
            </CircleMarker>
          );
        })}
        <FitContent points={[...(hasPoint ? [[lat, lng] as LatLng] : []), ...route, ...pois.map((p) => [p.lat, p.lng] as LatLng)]} />
        {onPick && <ClickHandler onPick={onPick} />}
      </MapContainer>
    </div>
  );
}

// Cadre la carte sur le contenu au premier affichage (sans recadrer à chaque clic d'édition).
function FitContent({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [30, 30], maxZoom: 16 });
  }, [map]);
  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapLegend({ showRoute = true }: { showRoute?: boolean }) {
  return (
    <div className="legend small">
      <span><i style={{ background: "#e4002b" }} /> Rassemblement</span>
      {showRoute && <span><i className="line" /> Parcours</span>}
      {POI_KINDS.filter((k) => k.id !== "rassemblement").map((k) => (
        <span key={k.id}><i style={{ background: k.color }} /> {k.label}</span>
      ))}
    </div>
  );
}
