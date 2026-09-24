import {
  parseBundle,
  BUNDLE_STORAGE_KEY as STORAGE_KEY,
  type MapBundle,
} from './bundle';
import { computeTransform, type AffineTransform } from './transform';
import { createPhotoViewport } from './photo-viewport';

const statusEl       = document.getElementById('status') as HTMLSpanElement;
const photoEl        = document.getElementById('photo') as HTMLImageElement;
const photoPanel     = document.getElementById('photo-panel') as HTMLDivElement;
const photoContainer = document.getElementById('photo-container') as HTMLDivElement;
const importInput    = document.getElementById('import-input') as HTMLInputElement;

const viewport = createPhotoViewport(photoPanel, photoContainer, photoEl);
// Fit + centre once the image has laid out (a new src re-fires `load`).
photoEl.addEventListener('load', () => viewport.reset());

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