import { useEffect, useMemo, useRef, useState } from 'react';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface OpenStreetMapProps {
  venue: Coordinates;
  radius: number;
  device?: (Coordinates & { accuracy?: number }) | null;
}

const TILE_SIZE = 256;
const MAX_LATITUDE = 85.05112878;

function project({ latitude, longitude }: Coordinates, zoom: number) {
  const latitudeRadians = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude)) * Math.PI / 180;
  const scale = TILE_SIZE * 2 ** zoom;
  return {
    x: (longitude + 180) / 360 * scale,
    y: (1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2 * scale,
  };
}

export default function OpenStreetMap({ venue, radius, device }: OpenStreetMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 420 });
  const [tilesFailed, setTilesFailed] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({
      width: Math.max(320, entry.contentRect.width),
      height: 420,
    }));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  const map = useMemo(() => {
    const venueAtZero = project(venue, 0);
    const venueRadiusAtZero = radius / (Math.cos(venue.latitude * Math.PI / 180) * 2 * Math.PI * 6378137) * TILE_SIZE;
    const deviceAtZero = device ? project(device, 0) : null;
    const deviceRadiusAtZero = device?.accuracy
      ? device.accuracy / (Math.cos(device.latitude * Math.PI / 180) * 2 * Math.PI * 6378137) * TILE_SIZE
      : 0;
    const minX = Math.min(venueAtZero.x - venueRadiusAtZero, ...(deviceAtZero ? [deviceAtZero.x - deviceRadiusAtZero] : []));
    const maxX = Math.max(venueAtZero.x + venueRadiusAtZero, ...(deviceAtZero ? [deviceAtZero.x + deviceRadiusAtZero] : []));
    const minY = Math.min(venueAtZero.y - venueRadiusAtZero, ...(deviceAtZero ? [deviceAtZero.y - deviceRadiusAtZero] : []));
    const maxY = Math.max(venueAtZero.y + venueRadiusAtZero, ...(deviceAtZero ? [deviceAtZero.y + deviceRadiusAtZero] : []));
    const scaleX = (size.width - 96) / Math.max(maxX - minX, 1e-8);
    const scaleY = (size.height - 96) / Math.max(maxY - minY, 1e-8);
    const zoom = Math.max(3, Math.min(18, Math.floor(Math.log2(Math.min(scaleX, scaleY)))));
    const worldScale = 2 ** zoom;
    const center = { x: (minX + maxX) / 2 * worldScale, y: (minY + maxY) / 2 * worldScale };
    const screen = (coordinates: Coordinates) => {
      const point = project(coordinates, zoom);
      return { x: size.width / 2 + point.x - center.x, y: size.height / 2 + point.y - center.y };
    };
    const topLeft = { x: center.x - size.width / 2, y: center.y - size.height / 2 };
    const firstTileX = Math.floor(topLeft.x / TILE_SIZE);
    const lastTileX = Math.floor((topLeft.x + size.width) / TILE_SIZE);
    const firstTileY = Math.max(0, Math.floor(topLeft.y / TILE_SIZE));
    const lastTileY = Math.min(2 ** zoom - 1, Math.floor((topLeft.y + size.height) / TILE_SIZE));
    const tiles = [];
    for (let x = firstTileX; x <= lastTileX; x++) {
      for (let y = firstTileY; y <= lastTileY; y++) {
        const wrappedX = ((x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom;
        tiles.push({ key: `${x}-${y}`, x: x * TILE_SIZE - topLeft.x, y: y * TILE_SIZE - topLeft.y, url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png` });
      }
    }
    const venuePosition = screen(venue);
    const radiusPixels = radius / (Math.cos(venue.latitude * Math.PI / 180) * 2 * Math.PI * 6378137 / (TILE_SIZE * worldScale));
    const deviceAccuracyPixels = device?.accuracy
      ? device.accuracy / (Math.cos(device.latitude * Math.PI / 180) * 2 * Math.PI * 6378137 / (TILE_SIZE * worldScale))
      : 0;
    return { zoom, tiles, venuePosition, devicePosition: device ? screen(device) : null, radiusPixels, deviceAccuracyPixels };
  }, [venue, device, radius, size]);

  return (
    <div ref={container} className="relative h-[420px] w-full overflow-hidden rounded-xl bg-slate-100" aria-label="Mapa de OpenStreetMap con la sede y tu ubicación">
      {map.tiles.map(tile => <img key={tile.key} src={tile.url} alt="" draggable={false} onError={() => setTilesFailed(true)} className="pointer-events-none absolute max-w-none" style={{ left: tile.x, top: tile.y, width: TILE_SIZE, height: TILE_SIZE }} />)}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${size.width} ${size.height}`} role="img" aria-label={`Mapa centrado en la sede, zoom ${map.zoom}`}>
        <circle cx={map.venuePosition.x} cy={map.venuePosition.y} r={map.radiusPixels} fill="#7c3aed" fillOpacity="0.16" stroke="#6d28d9" strokeWidth="2" />
        <circle cx={map.venuePosition.x} cy={map.venuePosition.y} r="8" fill="#6d28d9" stroke="white" strokeWidth="3" />
        {map.devicePosition && <>
          {map.deviceAccuracyPixels > 0 && <circle cx={map.devicePosition.x} cy={map.devicePosition.y} r={map.deviceAccuracyPixels} fill="#0284c7" fillOpacity="0.08" stroke="#0284c7" strokeOpacity="0.65" strokeDasharray="5 4" strokeWidth="2" />}
          <circle cx={map.devicePosition.x} cy={map.devicePosition.y} r="16" fill="#0284c7" fillOpacity="0.16" />
          <circle cx={map.devicePosition.x} cy={map.devicePosition.y} r="7" fill="#0284c7" stroke="white" strokeWidth="3" />
        </>}
      </svg>
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-3 rounded-md bg-white/95 px-3 py-2 text-xs text-gray-700 shadow">
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-violet-700" />Sede · radio permitido</span>
        {map.devicePosition && <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-sky-600" />Tu dispositivo y su margen de precisión</span>}
      </div>
      {tilesFailed && <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-white/95 px-3 py-2 text-xs text-red-700 shadow">No se pudieron cargar los mosaicos del mapa.</div>}
      <div className="absolute bottom-2 right-2 rounded bg-white/90 px-1.5 py-1 text-[10px] text-gray-700"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">© OpenStreetMap</a></div>
    </div>
  );
}
