import type { ReferencePair } from './transform';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export const BUNDLE_VERSION = 1 as const;

export type MapBundle = {
  version: typeof BUNDLE_VERSION;
  photoDataUrl: string;   // "data:image/jpeg;base64,…"
  naturalWidth: number;   // intrinsic px — stored so the field viewer
  naturalHeight: number;  // doesn't need to wait for <img> load
  pairs: ReferencePair[];
};

// -------------------------------------------------------------------
// Serialize
// -------------------------------------------------------------------

export function serializeBundle(bundle: MapBundle): string {
  return JSON.stringify(bundle);
}

// -------------------------------------------------------------------
// Parse + validate
// -------------------------------------------------------------------

export class BundleParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BundleParseError';
  }
}

export function parseBundle(json: string): MapBundle {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new BundleParseError('Not valid JSON');
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new BundleParseError('Bundle must be a JSON object');
  }

  const obj = raw as Record<string, unknown>;

  if (obj['version'] !== BUNDLE_VERSION) {
    throw new BundleParseError(
      `Unsupported bundle version: ${String(obj['version'])} (expected ${BUNDLE_VERSION})`,
    );
  }

  if (typeof obj['photoDataUrl'] !== 'string' || !obj['photoDataUrl'].startsWith('data:')) {
    throw new BundleParseError('Missing or invalid photoDataUrl');
  }

  if (typeof obj['naturalWidth'] !== 'number' || obj['naturalWidth'] <= 0) {
    throw new BundleParseError('Missing or invalid naturalWidth');
  }

  if (typeof obj['naturalHeight'] !== 'number' || obj['naturalHeight'] <= 0) {
    throw new BundleParseError('Missing or invalid naturalHeight');
  }

  if (!Array.isArray(obj['pairs'])) {
    throw new BundleParseError('Missing or invalid pairs array');
  }

  const pairs: ReferencePair[] = obj['pairs'].map((p: unknown, i: number) => {
    if (typeof p !== 'object' || p === null) {
      throw new BundleParseError(`pairs[${i}] is not an object`);
    }
    const pair = p as Record<string, unknown>;

    const pixel = pair['pixel'] as Record<string, unknown> | undefined;
    const geo   = pair['geo']   as Record<string, unknown> | undefined;

    if (
      typeof pixel?.['x'] !== 'number' ||
      typeof pixel?.['y'] !== 'number' ||
      typeof geo?.['lat'] !== 'number' ||
      typeof geo?.['lon'] !== 'number'
    ) {
      throw new BundleParseError(`pairs[${i}] has wrong shape`);
    }

    return {
      pixel: { x: pixel['x'] as number, y: pixel['y'] as number },
      geo:   { lat: geo['lat'] as number, lon: geo['lon'] as number },
    };
  });

  return {
    version: BUNDLE_VERSION,
    photoDataUrl:  obj['photoDataUrl'] as string,
    naturalWidth:  obj['naturalWidth']  as number,
    naturalHeight: obj['naturalHeight'] as number,
    pairs,
  };
}