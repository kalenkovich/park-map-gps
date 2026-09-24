import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import {
  computeTransform,
  projectPixelToGeo,
  projectGeoToPixel,
  type ReferencePair,
  type PixelPoint,
  type AffineTransform,
} from './transform';
import {
  serializeBundle,
  parseBundle,
  BundleParseError,
  BUNDLE_VERSION,
  BUNDLE_STORAGE_KEY as STORAGE_KEY,
} from './bundle';
import { createPhotoViewport, positionOnPhoto } from './photo-viewport';

// --- DOM ---
const photoEl          = document.getElementById('photo')             as HTMLImageElement;
const photoContainer   = document.getElementById('photo-container')   as HTMLDivElement;
const photoHint        = document.getElementById('photo-hint')        as HTMLDivElement;
const photoPanel       = document.getElementById('photo-panel')       as HTMLDivElement;
const statusEl         = document.getElementById('status')            as HTMLSpanElement;
const openPhotoInput   = document.getElementById('open-photo-input')  as HTMLInputElement;
const openPhotoText    = document.getElementById('open-photo-text')   as HTMLSpanElement;
const computeBtn       = document.getElementById('compute-btn')       as HTMLButtonElement;
const resetBtn         = document.getElementById('reset-btn')         as HTMLButtonElement;
const exportBtn        = document.getElementById('export-btn')        as HTMLButtonElement;
const importInput      = document.getElementById('import-input')      as HTMLInputElement;
const mapDiv           = document.getElementById('map')               as HTMLDivElement;

// --- State ---
type AppState = {
  photoReady: boolean;
  pairs: ReferencePair[];
  pendingPixel: PixelPoint | null;
  transform: AffineTransform | null;
};

const state: AppState = {
  photoReady: false,
  pairs: [],
  pendingPixel: null,
  transform: null,
};

// --- Leaflet ---
const leafletMap = L.map(mapDiv).setView([31.7767, 35.2345], 15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(leafletMap);

leafletMap.addControl(GeoSearchControl({
  provider: new OpenStreetMapProvider(),
  style: 'bar',
}));

const pairMarkers: L.CircleMarker[] = [];
let liveCursorMapMarker: L.CircleMarker | null = null;
let liveCursorPhotoDot: HTMLDivElement | null = null;

// --- Photo zoom + pan (shared with the field viewer) ---
const viewport = createPhotoViewport(photoPanel, photoContainer, photoEl);

// --- Helpers ---
function pixelFromMouseEvent(e: MouseEvent): PixelPoint {
  const rect = photoEl.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (photoEl.naturalWidth  / rect.width),
    y: (e.clientY - rect.top)  * (photoEl.naturalHeight / rect.height),
  };
}

function createDot(type: 'completed' | 'pending' | 'live'): HTMLDivElement {
  const dot = document.createElement('div');
  dot.className = `pin-dot pin-dot--${type}`;
  return dot;
}

// --- Open photo ---
function loadPhotoSrc(src: string, onReady: () => void): void {
  // Clear any stale live cursors before swapping the image.
  liveCursorMapMarker?.remove();
  liveCursorMapMarker = null;
  liveCursorPhotoDot?.remove();
  liveCursorPhotoDot = null;

  photoEl.addEventListener('load', () => {
    state.photoReady = true;
    photoHint.classList.add('hidden');
    photoContainer.classList.remove('hidden');
    viewport.reset();
    onReady();
  }, { once: true });

  photoEl.src = src;
}

openPhotoInput.addEventListener('change', () => {
  const file = openPhotoInput.files?.[0];
  if (!file) return;
  openPhotoInput.value = '';

  const reader = new FileReader();
  reader.onload = () => {
    // Opening a new photo resets all pinning state and clears the saved bundle
    // (the old pairs don't apply to the new photo).
    state.pairs = [];
    state.pendingPixel = null;
    state.transform = null;
    state.photoReady = false;
    pairMarkers.forEach((m) => m.remove());
    pairMarkers.length = 0;
    localStorage.removeItem(STORAGE_KEY);

    loadPhotoSrc(reader.result as string, render);
    render(); // update controls immediately (photo not yet loaded)
  };
  reader.readAsDataURL(file);
});

// --- Pinning: click handlers ---
photoEl.addEventListener('click', (e) => {
  if (viewport.wasDragged()) return; // was a pan, not a pin
  if (state.transform !== null) return;
  state.pendingPixel = pixelFromMouseEvent(e);
  render();
});

leafletMap.on('click', (e: L.LeafletMouseEvent) => {
  if (state.transform !== null) return;
  if (state.pendingPixel === null) return;
  state.pairs.push({
    pixel: state.pendingPixel,
    geo: { lat: e.latlng.lat, lon: e.latlng.lng },
  });
  state.pendingPixel = null;
  render();
});

// --- Compute / Reset ---
computeBtn.addEventListener('click', () => {
  state.transform = computeTransform(state.pairs);
  saveToLocalStorage(buildBundleJson());
  render();
});

resetBtn.addEventListener('click', () => {
  liveCursorMapMarker?.remove();
  liveCursorMapMarker = null;
  liveCursorPhotoDot?.remove();
  liveCursorPhotoDot = null;
  state.pairs = [];
  state.pendingPixel = null;
  state.transform = null;
  render();
});

// --- Bundle helpers ---
function buildBundleJson(): string {
  const canvas = document.createElement('canvas');
  canvas.width  = photoEl.naturalWidth;
  canvas.height = photoEl.naturalHeight;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  canvas.getContext('2d')!.drawImage(photoEl, 0, 0);
  return serializeBundle({
    version: BUNDLE_VERSION,
    photoDataUrl:  canvas.toDataURL('image/jpeg', 0.92),
    naturalWidth:  photoEl.naturalWidth,
    naturalHeight: photoEl.naturalHeight,
    pairs: state.pairs,
  });
}

function saveToLocalStorage(json: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // QuotaExceededError — image too large to cache; silently skip
  }
}

// --- Export bundle ---
exportBtn.addEventListener('click', () => {
  if (state.transform === null) return;

  const json = buildBundleJson();
  saveToLocalStorage(json);

  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'bundle.json';
  a.click();
  URL.revokeObjectURL(url);
});

// --- Import bundle ---
function restoreBundle(json: string): void {
  const bundle = parseBundle(json); // throws BundleParseError on invalid input

  state.pairs        = bundle.pairs;
  state.pendingPixel = null;
  state.transform    = computeTransform(bundle.pairs);
  state.photoReady   = false;

  pairMarkers.forEach((m) => m.remove());
  pairMarkers.length = 0;

  saveToLocalStorage(json);
  loadPhotoSrc(bundle.photoDataUrl, render);
  render(); // update controls while photo loads
}

importInput.addEventListener('change', () => {
  const file = importInput.files?.[0];
  if (!file) return;
  importInput.value = ''; // reset so the same file can be re-imported

  const reader = new FileReader();
  reader.onload = () => {
    try {
      restoreBundle(reader.result as string);
    } catch (err) {
      const msg = err instanceof BundleParseError ? err.message : 'Unknown error reading bundle';
      statusEl.textContent = `Import failed: ${msg}`;
    }
  };
  reader.readAsText(file);
});

// --- Live sync: mousemove handlers ---
photoEl.addEventListener('mousemove', (e) => {
  if (state.transform === null) return;
  const geo = projectPixelToGeo(state.transform, pixelFromMouseEvent(e));
  if (liveCursorMapMarker === null) {
    liveCursorMapMarker = L.circleMarker([geo.lat, geo.lon], {
      radius: 8,
      color: '#4c4',
      fillColor: '#4c4',
      fillOpacity: 0.8,
    }).addTo(leafletMap);
  } else {
    liveCursorMapMarker.setLatLng([geo.lat, geo.lon]);
  }
});

photoEl.addEventListener('mouseleave', () => {
  liveCursorMapMarker?.remove();
  liveCursorMapMarker = null;
});

leafletMap.on('mousemove', (e: L.LeafletMouseEvent) => {
  if (state.transform === null) return;
  const pixel = projectGeoToPixel(state.transform, { lat: e.latlng.lat, lon: e.latlng.lng });
  if (liveCursorPhotoDot === null) {
    liveCursorPhotoDot = createDot('live');
    photoContainer.appendChild(liveCursorPhotoDot);
  }
  positionOnPhoto(liveCursorPhotoDot, pixel, photoEl);
});

leafletMap.on('mouseout', () => {
  liveCursorPhotoDot?.remove();
  liveCursorPhotoDot = null;
});

// --- Render ---
function render(): void {
  renderPhotoDots();
  renderMapMarkers();
  renderControls();
}

function renderPhotoDots(): void {
  photoContainer.querySelectorAll('.pin-dot').forEach((d) => d.remove());
  for (const pair of state.pairs) {
    const dot = createDot('completed');
    photoContainer.appendChild(dot);
    positionOnPhoto(dot, pair.pixel, photoEl);
  }
  if (state.pendingPixel !== null) {
    const dot = createDot('pending');
    photoContainer.appendChild(dot);
    positionOnPhoto(dot, state.pendingPixel, photoEl);
  }
}

function renderMapMarkers(): void {
  pairMarkers.forEach((m) => m.remove());
  pairMarkers.length = 0;
  for (const pair of state.pairs) {
    pairMarkers.push(
      L.circleMarker([pair.geo.lat, pair.geo.lon], {
        radius: 6,
        color: '#e55',
        fillColor: '#e55',
        fillOpacity: 0.9,
      }).addTo(leafletMap),
    );
  }
}

function renderControls(): void {
  openPhotoText.textContent = state.photoReady ? 'Replace map photo' : 'Open map photo';
  const count = state.pairs.length;
  if (!state.photoReady) {
    statusEl.textContent = 'Open a map photo to begin';
    computeBtn.disabled = true;
    computeBtn.hidden = false;
    resetBtn.hidden  = true;
    exportBtn.hidden = true;
    return;
  }
  if (state.transform !== null) {
    statusEl.textContent = `Transform active (${count} pairs) — move mouse over either map`;
    computeBtn.hidden = true;
    resetBtn.hidden  = false;
    exportBtn.hidden = false;
  } else if (state.pendingPixel !== null) {
    statusEl.textContent = `Pair ${count + 1}: now click the matching point on the map`;
    computeBtn.disabled = true;
    computeBtn.hidden = false;
    resetBtn.hidden  = true;
    exportBtn.hidden = true;
  } else if (count === 0) {
    statusEl.textContent = 'Click a known point on the photo to start pinning';
    computeBtn.disabled = true;
    computeBtn.hidden = false;
    resetBtn.hidden  = true;
    exportBtn.hidden = true;
  } else {
    statusEl.textContent = `${count} pair${count !== 1 ? 's' : ''} — click the photo to add more`;
    computeBtn.disabled = count < 3;
    computeBtn.hidden = false;
    resetBtn.hidden  = true;
    exportBtn.hidden = true;
  }
}

// --- Auto-restore last bundle from localStorage ---
const savedBundle = localStorage.getItem(STORAGE_KEY);
if (savedBundle) {
  try {
    restoreBundle(savedBundle);
  } catch {
    localStorage.removeItem(STORAGE_KEY); // stale or corrupt — discard
    render();
  }
} else {
  render();
}