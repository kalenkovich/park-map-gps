import { describe, it, expect } from 'vitest';
import { zoomAt, MIN_SCALE, MAX_SCALE, type View } from './photo-viewport';

describe('zoomAt', () => {
  it('keeps the photo point under the cursor fixed', () => {
    const view: View = { tx: 10, ty: 20, scale: 2 };
    const cx = 100, cy = 50;

    // Photo-container-local point under the cursor before zooming
    const px = (cx - view.tx) / view.scale;
    const py = (cy - view.ty) / view.scale;

    const next = zoomAt(view, cx, cy, 1.5);

    expect(next.scale).toBeCloseTo(3);
    // ...and where that same point lands on screen afterwards
    expect(next.tx + px * next.scale).toBeCloseTo(cx);
    expect(next.ty + py * next.scale).toBeCloseTo(cy);
  });

  it('zooms out about the cursor too', () => {
    const view: View = { tx: -40, ty: -10, scale: 4 };
    const next = zoomAt(view, 30, 60, 0.5);
    const px = (30 - view.tx) / view.scale;
    expect(next.scale).toBeCloseTo(2);
    expect(next.tx + px * next.scale).toBeCloseTo(30);
  });

  it('clamps the scale at MAX_SCALE', () => {
    const next = zoomAt({ tx: 0, ty: 0, scale: 19 }, 0, 0, 2);
    expect(next.scale).toBe(MAX_SCALE);
  });

  it('clamps the scale at MIN_SCALE', () => {
    const next = zoomAt({ tx: 0, ty: 0, scale: 1.1 }, 0, 0, 0.5);
    expect(next.scale).toBe(MIN_SCALE);
  });

  it('does not move the view when already at a limit', () => {
    const atMax: View = { tx: -300, ty: -120, scale: MAX_SCALE };
    expect(zoomAt(atMax, 80, 40, 3)).toEqual(atMax);
  });
});