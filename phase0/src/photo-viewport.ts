// Zoom + pan for a photo inside a clipping panel, shared by the editor and
// the field viewer: mouse wheel zooms about the cursor, mouse drag pans.
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

export type PhotoViewport = {
  /** Fit the photo to the panel, centred, at scale 1. Call after the photo loads. */
  reset(): void;
  /** True if the last mouse gesture moved (was a pan, not a click). */
  wasDragged(): boolean;
};

export function createPhotoViewport(
  panel: HTMLElement,
  container: HTMLElement,
  photo: HTMLImageElement,
  isReady: () => boolean,
): PhotoViewport {
  let view: View = { tx: 0, ty: 0, scale: 1 };
  let dragOrigin: { x: number; y: number; view: View } | null = null;
  let didDrag = false;

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

  panel.addEventListener('wheel', (e) => {
    if (!isReady()) return;
    e.preventDefault();
    const rect = panel.getBoundingClientRect();
    view = zoomAt(
      view,
      e.clientX - rect.left,
      e.clientY - rect.top,
      e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP,
    );
    if (view.scale === MIN_SCALE) reset(); // re-centre when fully zoomed out
    else apply();
  }, { passive: false });

  // Pan: track drag on the panel; wasDragged() lets click handlers ignore the
  // click that ends a drag.
  panel.addEventListener('mousedown', (e) => {
    if (!isReady()) return;
    if (e.button !== 0) return;
    e.preventDefault(); // prevent native image drag taking over mouse events
    dragOrigin = { x: e.clientX, y: e.clientY, view };
    didDrag = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (dragOrigin === null) return;
    const dx = e.clientX - dragOrigin.x;
    const dy = e.clientY - dragOrigin.y;
    if (!didDrag && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) didDrag = true;
    if (didDrag) {
      view = { ...dragOrigin.view, tx: dragOrigin.view.tx + dx, ty: dragOrigin.view.ty + dy };
      apply();
    }
  });

  window.addEventListener('mouseup', () => { dragOrigin = null; });

  return { reset, wasDragged: () => didDrag };
}