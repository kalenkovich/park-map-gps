import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  computeTransform,
  projectPixelToGeo,
  projectGeoToPixel,
  type ReferencePair,
  type PixelPoint,
  type AffineTransform,
} from './transform';

// --- DOM ---
const photoEl        = document.getElementById('photo')           as HTMLImageElement;
const photoContainer = document.getElementById('photo-container') as HTMLDivElement;
const statusEl       = document.getElementById('status')          as HTMLSpanElement;
const computeBtn     = document.getElementById('compute-btn')     as HTMLButtonElement;
const resetBtn       = document.getElementById('reset-btn')       as HTMLButtonElement;
const mapDiv         = document.getElementById('map')             as HTMLDivElement;

// --- State ---
type AppState = {
  pairs: ReferencePair[];
  pendingPixel: PixelPoint | null;
  transform: AffineTransform | null;
};

const state: AppState = {
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

const pairMarkers: L.CircleMarker[] = [];
let liveCursorMapMarker: L.CircleMarker | null = null;
let liveCursorPhotoDot: HTMLDivElement | null = null;

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

function positionDot(dot: HTMLDivElement, pixel: PixelPoint): void {
  const rect = photoEl.getBoundingClientRect();
  dot.style.left = (pixel.x / photoEl.naturalWidth  * rect.width)  + 'px';
  dot.style.top  = (pixel.y / photoEl.naturalHeight * rect.height) + 'px';
}

// --- Pinning: click handlers ---
photoEl.addEventListener('click', (e) => {
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
  positionDot(liveCursorPhotoDot, pixel);
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
    positionDot(dot, pair.pixel);
  }
  if (state.pendingPixel !== null) {
    const dot = createDot('pending');
    photoContainer.appendChild(dot);
    positionDot(dot, state.pendingPixel);
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
  const count = state.pairs.length;
  if (state.transform !== null) {
    statusEl.textContent = `Transform active (${count} pairs) — move mouse over either map`;
    computeBtn.hidden = true;
    resetBtn.hidden = false;
  } else if (state.pendingPixel !== null) {
    statusEl.textContent = `Pair ${count + 1}: now click the matching point on the map`;
    computeBtn.disabled = true;
    computeBtn.hidden = false;
    resetBtn.hidden = true;
  } else if (count === 0) {
    statusEl.textContent = 'Click a known point on the photo to start pinning';
    computeBtn.disabled = true;
    computeBtn.hidden = false;
    resetBtn.hidden = true;
  } else {
    statusEl.textContent = `${count} pair${count !== 1 ? 's' : ''} — click the photo to add more`;
    computeBtn.disabled = count < 3;
    computeBtn.hidden = false;
    resetBtn.hidden = true;
  }
}

render();