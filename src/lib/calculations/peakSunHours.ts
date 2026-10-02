/**
 * Peak Sun Hours resolution: expanded city table → optional NASA POWER API → manual override.
 */

export interface SolarRegion {
  name: string;
  peakSunHours: number;
}

export type PshSource =
  | 'manual_override'
  | 'city_table'
  | 'nasa_power'
  | 'default_fallback';

export interface PeakSunHoursResult {
  peakSunHours: number;
  source: PshSource;
  matchedRegion?: string;
  latitude?: number;
  longitude?: number;
  note: string;
}

/** Expanded planning table (typical annual average PSH / GHI ≈ kWh/m²/day). */
export const SOLAR_REGIONS: SolarRegion[] = [
  { name: 'austin', peakSunHours: 4.8 },
  { name: 'london', peakSunHours: 3.2 },
  { name: 'lagos', peakSunHours: 5.2 },
  { name: 'sydney', peakSunHours: 5.0 },
  { name: 'miami', peakSunHours: 5.1 },
  { name: 'nairobi', peakSunHours: 5.6 },
  { name: 'berlin', peakSunHours: 3.4 },
  { name: 'paris', peakSunHours: 3.5 },
  { name: 'cairo', peakSunHours: 6.2 },
  { name: 'tokyo', peakSunHours: 3.8 },
  { name: 'new york', peakSunHours: 4.2 },
  { name: 'los angeles', peakSunHours: 5.4 },
  { name: 'johannesburg', peakSunHours: 5.5 },
  { name: 'mumbai', peakSunHours: 4.9 },
  { name: 'dubai', peakSunHours: 5.8 },
  { name: 'benin city', peakSunHours: 5.0 },
  { name: 'nigeria', peakSunHours: 5.1 },
  { name: 'abuja', peakSunHours: 5.3 },
  { name: 'port harcourt', peakSunHours: 4.6 },
  { name: 'accra', peakSunHours: 5.0 },
  { name: 'kumasi', peakSunHours: 4.8 },
  { name: 'nairobi', peakSunHours: 5.6 },
  { name: 'kampala', peakSunHours: 5.2 },
  { name: 'dar es salaam', peakSunHours: 5.3 },
  { name: 'cape town', peakSunHours: 5.4 },
  { name: 'durban', peakSunHours: 4.7 },
  { name: 'nairobi', peakSunHours: 5.6 },
  { name: 'addis ababa', peakSunHours: 5.5 },
  { name: 'casablanca', peakSunHours: 5.3 },
  { name: 'algiers', peakSunHours: 5.0 },
  { name: 'tunis', peakSunHours: 5.1 },
  { name: 'riyadh', peakSunHours: 6.0 },
  { name: 'jeddah', peakSunHours: 5.9 },
  { name: 'doha', peakSunHours: 5.7 },
  { name: 'kuwait', peakSunHours: 5.6 },
  { name: 'tehran', peakSunHours: 5.2 },
  { name: 'istanbul', peakSunHours: 4.4 },
  { name: 'athens', peakSunHours: 4.8 },
  { name: 'rome', peakSunHours: 4.5 },
  { name: 'madrid', peakSunHours: 4.9 },
  { name: 'lisbon', peakSunHours: 5.0 },
  { name: 'amsterdam', peakSunHours: 3.3 },
  { name: 'brussels', peakSunHours: 3.3 },
  { name: 'stockholm', peakSunHours: 3.0 },
  { name: 'oslo', peakSunHours: 2.9 },
  { name: 'helsinki', peakSunHours: 2.9 },
  { name: 'warsaw', peakSunHours: 3.4 },
  { name: 'prague', peakSunHours: 3.5 },
  { name: 'vienna', peakSunHours: 3.7 },
  { name: 'zurich', peakSunHours: 3.6 },
  { name: 'moscow', peakSunHours: 3.1 },
  { name: 'delhi', peakSunHours: 5.1 },
  { name: 'bangalore', peakSunHours: 5.3 },
  { name: 'chennai', peakSunHours: 5.4 },
  { name: 'kolkata', peakSunHours: 4.6 },
  { name: 'karachi', peakSunHours: 5.2 },
  { name: 'lahore', peakSunHours: 5.0 },
  { name: 'dhaka', peakSunHours: 4.7 },
  { name: 'bangkok', peakSunHours: 5.0 },
  { name: 'singapore', peakSunHours: 4.4 },
  { name: 'jakarta', peakSunHours: 4.5 },
  { name: 'manila', peakSunHours: 4.8 },
  { name: 'hong kong', peakSunHours: 4.2 },
  { name: 'shanghai', peakSunHours: 4.0 },
  { name: 'beijing', peakSunHours: 4.3 },
  { name: 'seoul', peakSunHours: 4.0 },
  { name: 'melbourne', peakSunHours: 4.3 },
  { name: 'brisbane', peakSunHours: 5.1 },
  { name: 'perth', peakSunHours: 5.4 },
  { name: 'auckland', peakSunHours: 4.2 },
  { name: 'honolulu', peakSunHours: 5.5 },
  { name: 'phoenix', peakSunHours: 6.5 },
  { name: 'denver', peakSunHours: 5.2 },
  { name: 'chicago', peakSunHours: 4.0 },
  { name: 'houston', peakSunHours: 4.8 },
  { name: 'seattle', peakSunHours: 3.6 },
  { name: 'toronto', peakSunHours: 3.8 },
  { name: 'vancouver', peakSunHours: 3.5 },
  { name: 'mexico city', peakSunHours: 5.2 },
  { name: 'sao paulo', peakSunHours: 4.4 },
  { name: 'rio de janeiro', peakSunHours: 4.6 },
  { name: 'buenos aires', peakSunHours: 4.5 },
  { name: 'santiago', peakSunHours: 5.0 },
  { name: 'lima', peakSunHours: 5.1 },
  { name: 'bogota', peakSunHours: 4.2 },
  { name: 'nairobi', peakSunHours: 5.6 },
  { name: 'kano', peakSunHours: 5.6 },
  { name: 'ibadan', peakSunHours: 5.0 },
  { name: 'enugu', peakSunHours: 4.9 },
  { name: 'warri', peakSunHours: 4.5 },
  { name: 'ghana', peakSunHours: 5.0 },
  { name: 'kenya', peakSunHours: 5.4 },
  { name: 'south africa', peakSunHours: 5.2 },
  { name: 'india', peakSunHours: 5.0 },
  { name: 'china', peakSunHours: 4.2 },
  { name: 'usa', peakSunHours: 4.5 },
  { name: 'uk', peakSunHours: 3.2 },
  { name: 'united kingdom', peakSunHours: 3.2 },
  { name: 'germany', peakSunHours: 3.4 },
  { name: 'france', peakSunHours: 3.8 },
  { name: 'spain', peakSunHours: 4.8 },
  { name: 'italy', peakSunHours: 4.5 },
  { name: 'brazil', peakSunHours: 4.6 },
  { name: 'australia', peakSunHours: 5.0 }
];

export function lookupCityPeakSunHours(location: string): PeakSunHoursResult {
  const normalized = location.toLowerCase().trim();
  if (!normalized) {
    return {
      peakSunHours: 4.5,
      source: 'default_fallback',
      note: 'No location entered — using default 4.5 peak sun hours. Enter a city or override PSH.'
    };
  }

  // Prefer longest name match (e.g. "port harcourt" before "port")
  const ranked = [...SOLAR_REGIONS].sort((a, b) => b.name.length - a.name.length);
  const found = ranked.find(r => normalized.includes(r.name));
  if (found) {
    return {
      peakSunHours: found.peakSunHours,
      source: 'city_table',
      matchedRegion: found.name,
      note: `Matched planning table for “${found.name}” (${found.peakSunHours} PSH). Override or lookup NASA for site-specific irradiance.`
    };
  }

  return {
    peakSunHours: 4.5,
    source: 'default_fallback',
    note: `No city match for “${location.trim()}” — using 4.5 PSH. Set a manual override or use Lookup irradiance.`
  };
}

export function resolvePeakSunHours(
  location: string,
  manualOverride?: number | null
): PeakSunHoursResult {
  if (manualOverride != null && Number.isFinite(manualOverride) && manualOverride > 0) {
    const psh = Math.min(8.5, Math.max(1.5, manualOverride));
    return {
      peakSunHours: parseFloat(psh.toFixed(2)),
      source: 'manual_override',
      note: `Manual peak sun hours override: ${psh.toFixed(2)} hrs/day.`
    };
  }
  return lookupCityPeakSunHours(location);
}

/** Legacy helper used across the codebase. */
export function getPeakSunHours(location: string): number {
  return lookupCityPeakSunHours(location).peakSunHours;
}

async function geocodeLocation(
  location: string
): Promise<{ lat: number; lon: number; displayName: string } | null> {
  const q = location.trim();
  if (!q) return null;
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=` +
    encodeURIComponent(q);
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      // Nominatim usage policy — identify the application
      'User-Agent': 'VoltSolarDesignTool/1.0 (solar sizing; local app)'
    }
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data?.[0]) return null;
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    displayName: data[0].display_name
  };
}

/**
 * Fetch climatology all-sky GHI (kWh/m²/day) ≈ annual average peak sun hours.
 * Uses NASA POWER (no API key). Falls back gracefully on network/CORS errors.
 */
export async function fetchNasaPowerPeakSunHours(
  location: string
): Promise<PeakSunHoursResult> {
  try {
    const geo = await geocodeLocation(location);
    if (!geo) {
      const fallback = lookupCityPeakSunHours(location);
      return {
        ...fallback,
        note: `Could not geocode “${location}”. ${fallback.note}`
      };
    }

    const url =
      `https://power.larc.nasa.gov/api/temporal/climatology/point` +
      `?parameters=ALLSKY_SFC_SW_DWN&community=RE` +
      `&longitude=${geo.lon.toFixed(4)}&latitude=${geo.lat.toFixed(4)}` +
      `&format=JSON`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`NASA POWER HTTP ${res.status}`);
    }
    const json = (await res.json()) as {
      properties?: { parameter?: { ALLSKY_SFC_SW_DWN?: Record<string, number> } };
    };
    const monthly = json.properties?.parameter?.ALLSKY_SFC_SW_DWN;
    if (!monthly) throw new Error('NASA POWER missing ALLSKY_SFC_SW_DWN');

    const annual = monthly.ANN ?? monthly.ann;
    let psh = typeof annual === 'number' ? annual : NaN;
    if (!Number.isFinite(psh)) {
      const months = Object.entries(monthly)
        .filter(([k]) => k !== 'ANN' && k !== 'ann')
        .map(([, v]) => v)
        .filter(v => typeof v === 'number' && Number.isFinite(v));
      psh = months.reduce((a, b) => a + b, 0) / Math.max(months.length, 1);
    }

    if (!Number.isFinite(psh) || psh < 1 || psh > 9) {
      throw new Error(`Unrealistic PSH ${psh}`);
    }

    const rounded = parseFloat(psh.toFixed(2));
    return {
      peakSunHours: rounded,
      source: 'nasa_power',
      latitude: geo.lat,
      longitude: geo.lon,
      matchedRegion: geo.displayName,
      note: `NASA POWER annual GHI ≈ ${rounded} kWh/m²/day at ${geo.lat.toFixed(2)}°, ${geo.lon.toFixed(2)}° (${geo.displayName}).`
    };
  } catch (err) {
    const fallback = lookupCityPeakSunHours(location);
    const msg = err instanceof Error ? err.message : 'lookup failed';
    return {
      ...fallback,
      note: `Irradiance lookup failed (${msg}). ${fallback.note}`
    };
  }
}
