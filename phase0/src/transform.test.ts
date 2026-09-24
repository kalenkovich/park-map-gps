import { describe, it, expect } from 'vitest';
import {
  computeTransform,
  projectPixelToGeo,
  projectGeoToPixel,
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