import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";

type Props = {
  lat: number | null;
  lng: number | null;
  onPick?: (lat: number, lng: number) => void;
  height?: number;
};

// Carte OpenStreetMap. Un clic place le point de rassemblement (si onPick est fourni).
export function EventMap({ lat, lng, onPick, height = 280 }: Props) {
  const hasPoint = lat !== null && lng !== null;
  const center: [number, number] = hasPoint ? [lat, lng] : [46.6, 2.5]; // centre de la France par défaut

  return (
    <div className="map" style={{ height }}>
      <MapContainer center={center} zoom={hasPoint ? 15 : 5} scrollWheelZoom={false} style={{ height: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hasPoint && <CircleMarker center={[lat, lng]} radius={10} pathOptions={{ color: "#b91c1c", fillOpacity: 0.8 }} />}
        {onPick && <ClickHandler onPick={onPick} />}
      </MapContainer>
    </div>
  );
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}
