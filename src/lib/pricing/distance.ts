export interface Coordinates {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

// Straight-line (haversine) distance — not real road distance, but a
// reasonable approximation for pricing without hitting Mapbox's Directions
// API on every checkout. Swap for real routing later if road distance
// needs to be more accurate (rivers, one-ways, etc. can inflate real
// distance beyond a straight line).
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

// Rough average speeds used only to estimate travel time for pricing —
// not real traffic-aware routing. Tune these if fees feel off in practice.
const AVERAGE_SPEED_KMH: Record<string, number> = {
  bicycle: 15,
  motorcycle: 30,
};

export function estimateMinutes(km: number, vehicleType: string): number {
  const speed = AVERAGE_SPEED_KMH[vehicleType] ?? 20;
  return (km / speed) * 60;
}