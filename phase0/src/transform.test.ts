import { describe, it, expect } from 'vitest';
import {
  computeTransform,
  projectPixelToGeo,
  projectGeoToPixel,
  type AffineTransform,
  type ReferencePair,
} from './transform';

const EPSILON = 1e-10;

function expectClose(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThan(EPSILON);
}

describe('transform', () => {
  it('case 1: pure scale, axis-aligned (3 points, exact fit)', () => {
    // lat = −0.01·y,  lon = 0.01·x
    // y-axis inverted: moving down in pixels = moving south in lat
    const pairs: ReferencePair[] = [
      { pixel: { x: 0, y: 0 }, geo: { lat: 0, lon: 0 } },
      { pixel: { x: 1, y: 0 }, geo: { lat: 0, lon: 0.01 } },
      { pixel: { x: 0, y: 1 }, geo: { lat: -0.01, lon: 0 } },
    ];
    const t = computeTransform(pairs);

    // Forward: pixel (5, 3) → lat = −0.03, lon = 0.05
    const fwd = projectPixelToGeo(t, { x: 5, y: 3 });
    expectClose(fwd.lat, -0.03);
    expectClose(fwd.lon, 0.05);

    // Inverse round-trip
    const inv = projectGeoToPixel(t, fwd);
    expectClose(inv.x, 5);
    expectClose(inv.y, 3);
  });

  it('case 2: scale + translation (3 points, exact fit)', () => {
    // lat = 51.5 − 0.01·y,  lon = −0.1 + 0.01·x
    const pairs: ReferencePair[] = [
      { pixel: { x: 0, y: 0 }, geo: { lat: 51.5, lon: -0.1 } },
      { pixel: { x: 100, y: 0 }, geo: { lat: 51.5, lon: 0.9 } },
      { pixel: { x: 0, y: 100 }, geo: { lat: 50.5, lon: -0.1 } },
    ];
    const t = computeTransform(pairs);

    // Forward: pixel (50, 50) → lat = 51.0, lon = 0.4
    const fwd = projectPixelToGeo(t, { x: 50, y: 50 });
    expectClose(fwd.lat, 51.0);
    expectClose(fwd.lon, 0.4);

    // Inverse round-trip
    const inv = projectGeoToPixel(t, fwd);
    expectClose(inv.x, 50);
    expectClose(inv.y, 50);
  });

  it('case 3: rotation-like transform (4 points, overdetermined)', () => {
    // lat = x + y,  lon = x − y
    // inverse: x = (lat+lon)/2,  y = (lat−lon)/2
    // 4th point makes it overdetermined (but exactly consistent)
    const pairs: ReferencePair[] = [
      { pixel: { x: 0, y: 0 }, geo: { lat: 0, lon: 0 } },
      { pixel: { x: 1, y: 0 }, geo: { lat: 1, lon: 1 } },
      { pixel: { x: 0, y: 1 }, geo: { lat: 1, lon: -1 } },
      { pixel: { x: 1, y: 1 }, geo: { lat: 2, lon: 0 } },
    ];
    const t = computeTransform(pairs);

    // Coefficients
    expectClose(t.a, 1);
    expectClose(t.b, 1);
    expectClose(t.c, 0);
    expectClose(t.d, 1);
    expectClose(t.e, -1);
    expectClose(t.f, 0);

    // Forward: pixel (3, 2) → lat = 5, lon = 1
    const fwd = projectPixelToGeo(t, { x: 3, y: 2 });
    expectClose(fwd.lat, 5);
    expectClose(fwd.lon, 1);

    // Inverse: (5+1)/2 = 3, (5−1)/2 = 2
    const inv = projectGeoToPixel(t, fwd);
    expectClose(inv.x, 3);
    expectClose(inv.y, 2);
  });
});

describe('projectGeoToPixel degeneracy check', () => {
  it('accepts a realistic high-resolution photo (4000×3000 px over ~400×300 m)', () => {
    // Coefficients are degrees per pixel, so with this many pixels they are
    // ~1e-6 and the determinant (units (°/px)²) is ~1e-12 — the check must be
    // relative to the transform's scale, not an absolute constant.
    const M_PER_DEG_LAT = 111_320;
    const lat0 = 32;
    const lon0 = 35;
    const dLatPerPx = 300 / 3000 / M_PER_DEG_LAT;
    const dLonPerPx = 400 / 4000 / (M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180));
    // North-up: lat decreases down the image, lon increases to the right.
    const pair = (x: number, y: number): ReferencePair => ({
      pixel: { x, y },
      geo: { lat: lat0 - y * dLatPerPx, lon: lon0 + x * dLonPerPx },
    });
    const t = computeTransform([pair(0, 0), pair(4000, 0), pair(0, 3000), pair(4000, 3000)]);

    const geo = projectPixelToGeo(t, { x: 1234, y: 567 });
    const px = projectGeoToPixel(t, geo); // must not throw
    expect(Math.abs(px.x - 1234)).toBeLessThan(1e-3);
    expect(Math.abs(px.y - 567)).toBeLessThan(1e-3);
  });

  it('rejects a degenerate transform (parallel lat/lon gradients) at any scale', () => {
    // Rows (a,b) and (d,e) are parallel, so the matrix is singular.
    for (const s of [1, 1e-6, 1e-9]) {
      const t: AffineTransform = { a: s, b: 2 * s, c: 0, d: 2 * s, e: 4 * s, f: 0 };
      expect(() => projectGeoToPixel(t, { lat: 0, lon: 0 })).toThrow(/degenerate/);
    }
  });
});