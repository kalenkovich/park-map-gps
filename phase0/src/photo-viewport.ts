// Zoom + pan for a photo inside a clipping panel, shared by the editor and
// the field viewer. Handles mouse (wheel zoom, drag pan) and touch (one-finger
// pan, two-finger pinch) through the Pointer Events API, which treats both
// uniformly.
//
// DOM contract (both pages use the same shape):
//   <div panel>            position: relative; overflow: hidden
//     <div container>      position: absolute; transform-origin: 0 0
//       <img photo>        sized by CSS to "fit the panel" (that is scale 1)

export type View = {
  tx: number;    // translation of the container's top-left within the panel (px)
  ty: number;
  scale: number; // zoom multiplier (1 = fit-to-panel, no zoom)
};

export const MIN_SCALE = 1;
export const MAX_SCALE = 20;
const WHEEL_STEP = 1.2;
const DRAG_THRESHOLD_PX = 3;

/**
 * Zoom by `factor` about the point (cx, cy), given in panel coordinates, so
 * the photo point under (cx, cy) stays put. The resulting scale is clamped to
 * [MIN_SCALE, MAX_SCALE]. Pure — no DOM.
 */
export function zoomAt(view: View, cx: number, cy: number, factor: number): View {
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, view.scale * factor));
  const k = scale / view.scale; // effective factor after clamping
  return {
    tx: cx - (cx - view.tx) * k,
    ty: cy - (cy - view.ty) * k,
    scale,
  };
}

type Point = { x: number; y: number };

export type PhotoViewport = {
  /** Fit the photo to the panel, centred, at scale 1. Call after the photo loads. */
  reset(): void;
  /** True if the last pointer gesture moved (was a pan/pinch, not a tap). */
  wasDragged(): boolean;
};

export function createPhotoViewport(
  panel: HTMLElement,
  container: HTMLElement,
  photo: HTMLImageElement,
): PhotoViewport {
  let view: View = { tx: 0, ty: 0, scale: 1 };
  let didDrag = false;

  // Pointers currently down (client coordinates), keyed by pointerId.
  const pointers = new Map<number, Point>();
  // One pointer down → pan; two → pinch. At most one of these is non-null.
  let panAnchor: { pointer: Point; view: View } | null = null;
  let pinchPrev: { dist: number; mid: Point } | null = null;

  // Without this the browser claims touch drags for page scrolling/zooming
  // and we'd get pointercancel instead of pointermove.
  panel.style.touchAction = 'none';
  panel.style.userSelect = 'none';

  const isReady = (): boolean => photo.complete && photo.naturalWidth > 0;

  function apply(): void {
    container.style.transform =
      `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`;
  }

  function reset(): void {
    view = {
      tx: (panel.offsetWidth  - photo.offsetWidth)  / 2,
      ty: (panel.offsetHeight - photo.offsetHeight) / 2,
      scale: 1,
    };
    apply();
  }

  function toPanel(p: Point): Point {
    const rect = panel.getBoundingClientRect();
    return { x: p.x - rect.left, y: p.y - rect.top };
  }

  function zoomBy(centre: Point, factor: number): void {
    const c = toPanel(centre);
    view = zoomAt(view, c.x, c.y, factor);
    if (view.scale === MIN_SCALE) reset(); // re-centre when fully zoomed out
    else apply();
  }

  // Distance between and midpoint of the two pinch pointers.
  function measurePinch(): { dist: number; mid: Point } {
    const [a, b] = [...pointers.values()] as [Point, Point];
    return {
      dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), // never 0: it's a divisor
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }

  // Re-derive the gesture from how many pointers are down. Called whenever a
  // pointer arrives or leaves, so e.g. lifting one finger of a pinch hands
  // over to a pan from the current view without a jump.
  function beginGesture(): void {
    panAnchor = null;
    pinchPrev = null;
    if (pointers.size === 1) {
      const [pointer] = [...pointers.values()] as [Point];
      panAnchor = { pointer, view };
    } else if (pointers.size === 2) {
      pinchPrev = measurePinch();
    }
  }

  // --- Mouse wheel ---
  panel.addEventListener('wheel', (e) => {
    if (!isReady()) return;
    e.preventDefault();
    zoomBy({ x: e.clientX, y: e.clientY }, e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP);
  }, { passive: false });

  // --- Pointers ---
  // We deliberately don't call setPointerCapture: capture would retarget the
  // `click` event to the panel and break the editor's click-on-photo pinning.
  // Move/up go on `window` so a drag that leaves the panel still tracks.
  panel.addEventListener('pointerdown', (e) => {
    if (!isReady()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (pointers.size === 0) didDrag = false;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    beginGesture();
  });

  window.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (panAnchor !== null) {
      const dx = e.clientX - panAnchor.pointer.x;
      const dy = e.clientY - panAnchor.pointer.y;
      if (!didDrag && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) didDrag = true;
      if (didDrag) {
        view = { ...panAnchor.view, tx: panAnchor.view.tx + dx, ty: panAnchor.view.ty + dy };
        apply();
      }
    } else if (pinchPrev !== null) {
      const now = measurePinch();
      didDrag = true;
      // Follow the fingers' midpoint (pan), then scale about it (zoom).
      view = {
        ...view,
        tx: view.tx + (now.mid.x - pinchPrev.mid.x),
        ty: view.ty + (now.mid.y - pinchPrev.mid.y),
      };
      zoomBy(now.mid, now.dist / pinchPrev.dist);
      pinchPrev = now;
    }
  });

  function release(e: PointerEvent): void {
    if (!pointers.delete(e.pointerId)) return;
    beginGesture();
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  // The browser's native image drag would otherwise take over the gesture.
  container.addEventListener('dragstart', (e) => e.preventDefault());

  return { reset, wasDragged: () => didDrag };
}