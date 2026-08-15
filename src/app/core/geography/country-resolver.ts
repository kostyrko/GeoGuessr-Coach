import countryBoundaryData from '@geo-maps/countries-land-10km/map.geo.json';

import type { GeoCoordinate } from '../capture/capture-contract';

export const COUNTRY_BOUNDARY_DATASET = {
  name: '@geo-maps/countries-land-10km',
  version: '0.6.0',
  isoRepresentation: 'ISO 3166-1 alpha-3',
} as const;

type Position = readonly [number, number];
type Ring = readonly Position[];

interface CountryFeature {
  geometry: {
    coordinates: readonly Ring[] | readonly (readonly Ring[])[];
    type: 'MultiPolygon' | 'Polygon';
  };
  properties: { A3: string };
}

export interface CountryResolution {
  countryCode?: string;
  source: 'boundary' | 'trusted-payload' | 'unresolved';
}

export interface RoundCountryResolution {
  actual: CountryResolution;
  guess: CountryResolution;
}

const countryFeatures = (countryBoundaryData as unknown as { features: readonly CountryFeature[] })
  .features;

/**
 * Resolves a coordinate from the bundled offline land-boundary dataset. A
 * trusted country code already supplied by a supported post-result payload is
 * preferred, because it is more authoritative than a simplified boundary.
 */
export function resolveCountry(
  coordinate: GeoCoordinate | null | undefined,
  trustedCountryCode?: string | null,
): CountryResolution {
  const normalizedTrustedCode = normalizeIsoAlpha3(trustedCountryCode);
  if (normalizedTrustedCode) {
    return { countryCode: normalizedTrustedCode, source: 'trusted-payload' };
  }

  if (!isValidCoordinate(coordinate)) {
    return { source: 'unresolved' };
  }

  const point: Position = [coordinate.longitude, coordinate.latitude];
  const matchingFeature = countryFeatures.find((feature) => containsPoint(feature.geometry, point));

  return matchingFeature
    ? { countryCode: matchingFeature.properties.A3, source: 'boundary' }
    : { source: 'unresolved' };
}

export function resolveRoundCountries(
  actual: GeoCoordinate | null | undefined,
  guess: GeoCoordinate | null | undefined,
  trustedActualCountryCode?: string | null,
  trustedGuessedCountryCode?: string | null,
): RoundCountryResolution {
  return {
    actual: resolveCountry(actual, trustedActualCountryCode),
    guess: resolveCountry(guess, trustedGuessedCountryCode),
  };
}

function normalizeIsoAlpha3(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : undefined;
}

function isValidCoordinate(
  coordinate: GeoCoordinate | null | undefined,
): coordinate is GeoCoordinate {
  return (
    coordinate !== null &&
    coordinate !== undefined &&
    Number.isFinite(coordinate.latitude) &&
    Number.isFinite(coordinate.longitude) &&
    coordinate.latitude >= -90 &&
    coordinate.latitude <= 90 &&
    coordinate.longitude >= -180 &&
    coordinate.longitude <= 180
  );
}

function containsPoint(geometry: CountryFeature['geometry'], point: Position): boolean {
  if (geometry.type === 'Polygon') {
    return containsPolygon(geometry.coordinates as readonly Ring[], point);
  }

  return (geometry.coordinates as readonly (readonly Ring[])[]).some((polygon) =>
    containsPolygon(polygon, point),
  );
}

function containsPolygon(rings: readonly Ring[], point: Position): boolean {
  const [outerRing, ...holes] = rings;
  return (
    outerRing !== undefined &&
    pointInRing(point, outerRing) &&
    !holes.some((hole) => pointInRing(point, hole))
  );
}

/** Ray casting with an explicit boundary check, so border coordinates have a stable result. */
function pointInRing(point: Position, ring: Ring): boolean {
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index];
    const prior = ring[previous];

    if (current === undefined || prior === undefined) {
      continue;
    }

    if (pointOnSegment(point, prior, current)) {
      return true;
    }

    const intersects =
      current[1] > point[1] !== prior[1] > point[1] &&
      point[0] <
        ((prior[0] - current[0]) * (point[1] - current[1])) / (prior[1] - current[1]) + current[0];

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointOnSegment(point: Position, start: Position, end: Position): boolean {
  const cross =
    (point[1] - start[1]) * (end[0] - start[0]) - (point[0] - start[0]) * (end[1] - start[1]);
  const epsilon = 1e-9;

  if (Math.abs(cross) > epsilon) {
    return false;
  }

  return (
    point[0] >= Math.min(start[0], end[0]) - epsilon &&
    point[0] <= Math.max(start[0], end[0]) + epsilon &&
    point[1] >= Math.min(start[1], end[1]) - epsilon &&
    point[1] <= Math.max(start[1], end[1]) + epsilon
  );
}
