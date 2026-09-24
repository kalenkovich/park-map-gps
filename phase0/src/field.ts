import {
  parseBundle,
  BUNDLE_STORAGE_KEY as STORAGE_KEY,
  type MapBundle,
} from './bundle';
import {
  computeTransform,
  projectGeoToPixel,
  type AffineTransform,
  type GeoPoint,
} from './transform';
import { createPhotoViewport, positionOnPhoto } from './photo-viewport';

const statusEl       = document.getElementById('status') as HTMLSpanElement;
const photoEl        = document.getElementById('photo') as HTMLImageElement;
const photoPanel     = document.getElementById('photo-panel') as HTMLDivElement;
const photoContainer = document.getElementById('photo-container') as HTMLDivElement;
const gpsDot         = document.getElementById('gps-dot') as HTMLDivElement;
const gpsStatusEl    = document.getElementById('gps-status') as HTMLDivElement;
const importInput    = document.getElementById('import-input') as HTMLInputElement;

const viewport = createPhotoViewport(photoPanel, photoContainer, photoEl);
// Fit + centre once the image has laid out (a new src re-fires `load`), then
// place the dot: a GPS fix may have arrived before the photo could be measured.
photoEl.addEventListener('load', () => {
  viewport.reset();
  updateGpsDot();
});

// `null` until a bundle has been loaded successfully.
let loaded: { bundle: MapBundle; transform: AffineTransform } | null = null;

function setStatus(message: string, isError = false): void {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function render(note = ''): void {
  if (loaded === null) return;
  photoEl.src = loaded.bundle.photoDataUrl;
  photoEl.hidden = false;
  const n = loaded.bundle.pairs.length;
  setStatus(`${n} reference points · transform ready${note}`);
}

/**
 * Parse → compute the transform → adopt as the current bundle → (optionally)
 * persist. Everything that can throw runs before we touch `loaded` or
 * localStorage, so a bad file never replaces a good one.
 */
function loadBundle(json: string, persist: boolean): void {
  const bundle = parseBundle(json);
  const transform = computeTransform(bundle.pairs); // throws if < 3 pairs or degenerate
  loaded = { bundle, transform };

  let note = '';
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, json);
    } catch {
      // QuotaExceededError — the photo is too big to cache. The bundle still
      // works this session, but tell the user it won't survive a reload.
      note = ' · could not save (too large); re-load next visit';
    }
  }
  render(note);
  startGps();
  updateGpsDot(); // re-project the last fix (if any) with the new transform
}

// --- Live GPS ---
// Started once a bundle is loaded, so the permission prompt doesn't appear on
// an empty page. Each fix is projected through the bundle's transform to a
// photo pixel and drawn as the dot.
let lastFix: { geo: GeoPoint; accuracy: number } | null = null;
let watchId: number | null = null;

function setGpsStatus(message: string, isError = false): void {
  gpsStatusEl.textContent = message;
  gpsStatusEl.classList.toggle('error', isError);
}

function updateGpsDot(): void {
  if (loaded === null || lastFix === null) return;
  // Not measurable until the photo has loaded; the `load` handler retries.
  if (photoEl.naturalWidth === 0) return;

  try {
    const pixel = projectGeoToPixel(loaded.transform, lastFix.geo);
    positionOnPhoto(gpsDot, pixel, photoEl);
    gpsDot.hidden = false;

    const inside =
      pixel.x >= 0 && pixel.x <= photoEl.naturalWidth &&
      pixel.y >= 0 && pixel.y <= photoEl.naturalHeight;
    setGpsStatus(
      inside ? `GPS ±${Math.round(lastFix.accuracy)} m` : 'GPS: you are outside the map',
    );
  } catch (err) {
    // projectGeoToPixel throws if the transform is degenerate.
    setGpsStatus(`Can't place GPS dot: ${err instanceof Error ? err.message : String(err)}`, true);
  }
}

function startGps(): void {
  if (watchId !== null) return; // already watching
  if (!('geolocation' in navigator)) {
    setGpsStatus('GPS is not available on this device', true);
    return;
  }
  if (!window.isSecureContext) {
    setGpsStatus('GPS needs HTTPS (or localhost)', true);
    return;
  }
  setGpsStatus('GPS: waiting for a fix…');
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      lastFix = {
        geo: { lat: pos.coords.latitude, lon: pos.coords.longitude },
        accuracy: pos.coords.accuracy,
      };
      updateGpsDot();
    },
    (err) => setGpsStatus(`GPS error: ${err.message}`, true),
    { enableHighAccuracy: true },
  );
}

// --- Load from a file picked by the user ---
importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  if (!file) return;
  importInput.value = ''; // allow re-picking the same file
  try {
    loadBundle(await file.text(), true);
  } catch (err) {
    setStatus(`Load failed: ${err instanceof Error ? err.message : String(err)}`, true);
  }
});

// --- Auto-restore the last bundle from localStorage ---
const saved = localStorage.getItem(STORAGE_KEY);
if (saved) {
  try {
    loadBundle(saved, false);
  } catch {
    localStorage.removeItem(STORAGE_KEY); // stale or corrupt — discard
  }
}