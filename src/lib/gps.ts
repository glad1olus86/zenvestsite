/**
 * GPS API client for royfis.com
 *
 * Response format (keyed by VIN):
 * {
 *   "WV1ZZZ7HZJX012539": {
 *     id: "569626",
 *     name: "Василь Зеленый Течек",
 *     vin: "WV1ZZZ7HZJX012539",
 *     brand: "Volkswagen",
 *     model: "Transporter T6",
 *     km: "143507",
 *     voltage: "13.4",
 *     loc: { lat: "50.114105", lon: "14.4711166", speed: "36", sat: "47", date_rec: "2026-03-25 18:50:59" }
 *   }
 * }
 */

export interface RoyfisVehicle {
  vin: string;
  name: string;
  brand?: string;
  model?: string;
  km?: string;
  voltage?: string;
  lat: number;
  lng: number;
  speed: number | null;
  timestamp: string;
}

interface RoyfisRawVehicle {
  id?: string;
  vin?: string;
  name?: string;
  brand?: string;
  model?: string;
  km?: string;
  voltage?: string;
  fuel_level?: string;
  cool_temp?: string;
  obd_errors?: string;
  loc?: {
    lat?: string;
    lon?: string;
    speed?: string;
    sat?: string;
    date_rec?: string;
  };
  // Flat format fallback
  lat?: string | number;
  lng?: string | number;
  lon?: string | number;
  speed?: string | number;
  timestamp?: string;
}

function normalizeVehicle(raw: RoyfisRawVehicle, vinKey?: string): RoyfisVehicle | null {
  const vin = raw.vin || vinKey || '';

  // Coordinates from nested loc or flat
  const lat = raw.loc?.lat ?? raw.lat;
  const lng = raw.loc?.lon ?? raw.lng ?? raw.lon;
  const speed = raw.loc?.speed ?? raw.speed;
  const timestamp = raw.loc?.date_rec ?? raw.timestamp ?? '';

  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (!vin || isNaN(latNum) || isNaN(lngNum) || (latNum === 0 && lngNum === 0)) {
    return null;
  }

  return {
    vin,
    name: raw.name || '',
    brand: raw.brand,
    model: raw.model,
    km: raw.km,
    voltage: raw.voltage,
    lat: latNum,
    lng: lngNum,
    speed: speed != null && speed !== '' ? Number(speed) : null,
    timestamp,
  };
}

function getApiConfig() {
  const apiUrl = process.env.ROYFIS_API_URL;
  const token = process.env.ROYFIS_BEARER_TOKEN;
  const userUi = process.env.ROYFIS_USER_UI;
  if (!apiUrl || !token || !userUi) return null;
  return { apiUrl, token, userUi };
}

export async function fetchAllVehicles(): Promise<RoyfisVehicle[]> {
  const cfg = getApiConfig();
  if (!cfg) return [];

  try {
    const res = await fetch(`${cfg.apiUrl}?user_ui=${encodeURIComponent(cfg.userUi)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`GPS API "all" returned ${res.status} — falling back to per-VIN queries`);
      return [];
    }

    const text = await res.text();
    if (!text || text.trim() === '' || text.trim() === 'null' || text.trim() === 'no auth') {
      return [];
    }

    return parseGpsResponse(text);
  } catch (err) {
    console.error('GPS API fetch error:', err);
    return [];
  }
}

/**
 * Fetch single vehicle by VIN
 */
export async function fetchVehicleByVin(vin: string): Promise<RoyfisVehicle | null> {
  const cfg = getApiConfig();
  if (!cfg) return null;

  try {
    const url = `${cfg.apiUrl}?${new URLSearchParams({ user_ui: cfg.userUi, vin })}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const text = await res.text();
    if (!text || text.trim() === '' || text.trim() === 'null') return null;

    const data = JSON.parse(text);
    if (!data || typeof data !== 'object') return null;

    // Response is keyed by VIN: { "VIN123": { ... } }
    if (data[vin]) {
      return normalizeVehicle(data[vin], vin);
    }

    // Or might be the vehicle object directly
    if (data.loc || data.lat) {
      return normalizeVehicle(data, vin);
    }

    // Or keyed by something else
    const values = Object.values(data) as RoyfisRawVehicle[];
    if (values.length === 1 && typeof values[0] === 'object') {
      return normalizeVehicle(values[0], vin);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch all vehicles — first try "all" endpoint, then fallback to per-VIN
 */
export async function fetchAllVehiclesWithFallback(vins: string[]): Promise<RoyfisVehicle[]> {
  // Try "all vehicles" endpoint first
  const all = await fetchAllVehicles();
  if (all.length > 0) return all;

  // Fallback: query each VIN individually (for when "all" returns 500)
  const results: RoyfisVehicle[] = [];
  for (const vin of vins) {
    const vehicle = await fetchVehicleByVin(vin);
    if (vehicle) results.push(vehicle);
  }
  return results;
}

function parseGpsResponse(text: string): RoyfisVehicle[] {
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object') return [];

    // Array of vehicles
    if (Array.isArray(data)) {
      return data.map((v) => normalizeVehicle(v)).filter((v): v is RoyfisVehicle => v !== null);
    }

    // Object keyed by VIN: { "VIN123": { id, name, vin, loc: { lat, lon } }, ... }
    const results: RoyfisVehicle[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        const v = normalizeVehicle(value as RoyfisRawVehicle, key);
        if (v) results.push(v);
      }
    }
    return results;
  } catch (e) {
    console.error('GPS API parse error:', e, 'Raw:', text.substring(0, 500));
    return [];
  }
}

/**
 * Haversine distance in meters between two coordinates
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInsideGeozone(
  lat: number, lng: number,
  zoneLat: number, zoneLng: number, radiusM: number
): boolean {
  return haversineDistance(lat, lng, zoneLat, zoneLng) <= radiusM;
}
