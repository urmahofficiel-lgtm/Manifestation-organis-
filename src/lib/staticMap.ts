// Dessine un plan (fond OpenStreetMap + parcours + repères) dans une image, pour l'annexe du PDF.
// Les tuiles OpenStreetMap autorisent ce type d'usage depuis le navigateur ; l'attribution est ajoutée sur l'image.
import { POI_KINDS, type LatLng, type Poi } from "./types";

const TILE = 256;

function project(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = TILE * 2 ** zoom;
  const s = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale,
  };
}

export function chooseZoom(points: LatLng[], width: number, height: number): number {
  if (points.length < 2) return 16;
  for (let z = 17; z >= 3; z--) {
    const ps = points.map(([la, ln]) => project(la, ln, z));
    const w = Math.max(...ps.map((p) => p.x)) - Math.min(...ps.map((p) => p.x));
    const h = Math.max(...ps.map((p) => p.y)) - Math.min(...ps.map((p) => p.y));
    if (w <= width * 0.8 && h <= height * 0.8) return z;
  }
  return 3;
}

function loadTile(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function renderStaticMap(
  opts: { point: LatLng | null; route: LatLng[]; pois: Poi[] },
  width = 1000,
  height = 640,
): Promise<string | null> {
  const all: LatLng[] = [...(opts.point ? [opts.point] : []), ...opts.route, ...opts.pois.map((p) => [p.lat, p.lng] as LatLng)];
  if (all.length === 0) return null;
  const zoom = chooseZoom(all, width, height);
  const ps = all.map(([la, ln]) => project(la, ln, zoom));
  const cx = (Math.min(...ps.map((p) => p.x)) + Math.max(...ps.map((p) => p.x))) / 2;
  const cy = (Math.min(...ps.map((p) => p.y)) + Math.max(...ps.map((p) => p.y))) / 2;
  const left = cx - width / 2;
  const top = cy - height / 2;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#e5e3df";
  ctx.fillRect(0, 0, width, height);

  const max = 2 ** zoom;
  const tiles: Promise<void>[] = [];
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty++) {
      if (ty < 0 || ty >= max) continue;
      const wrapped = ((tx % max) + max) % max;
      tiles.push(
        loadTile(`https://tile.openstreetmap.org/${zoom}/${wrapped}/${ty}.png`).then((img) => {
          if (img) ctx.drawImage(img, tx * TILE - left, ty * TILE - top);
        }),
      );
    }
  }
  await Promise.all(tiles);

  const toPx = ([la, ln]: LatLng) => {
    const p = project(la, ln, zoom);
    return { x: p.x - left, y: p.y - top };
  };
  if (opts.route.length > 1) {
    ctx.strokeStyle = "#e4002b";
    ctx.lineWidth = 7;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    opts.route.forEach((pt, i) => {
      const p = toPx(pt);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }
  const dot = (p: { x: number; y: number }, color: string, r: number) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#111";
    ctx.stroke();
  };
  if (opts.point) dot(toPx(opts.point), "#e4002b", 12);
  for (const poi of opts.pois) dot(toPx([poi.lat, poi.lng]), POI_KINDS.find((k) => k.id === poi.kind)?.color ?? "#111", 10);

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(width - 230, height - 22, 230, 22);
  ctx.fillStyle = "#111";
  ctx.font = "13px sans-serif";
  ctx.fillText("© les contributeurs OpenStreetMap", width - 222, height - 7);

  try {
    return canvas.toDataURL("image/jpeg", 0.88);
  } catch {
    return null; // tuiles bloquées : pas de plan dans le PDF
  }
}
