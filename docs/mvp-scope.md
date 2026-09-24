# MVP scope and phases

## Phase 0 — Web prototype of the alignment core
The riskiest, most novel part of the whole idea: can a photographed
(possibly hand-drawn, non-uniformly scaled) map be reliably aligned to
real-world GPS coordinates from a handful of reference points?

Build this as a plain TypeScript + Leaflet/OSM static web page — no
backend, no mobile plumbing — so iteration is fast (instant reload, no
device needed, can simulate GPS by typing coordinates).

Steps:
1. Upload a map photo, display it.
2. Side-by-side real map (Leaflet/OSM) for picking reference points.
3. Click a point on the photo, click the matching real-world point on
   the map → store (pixel, lat/lon) pair. Repeat for 3–4 points.
4. Compute an affine transform from the pairs (and its inverse).
5. Given a typed-in "simulated GPS" lat/lon, project and show the dot
   on the photo. Sanity-check with known points.
6. Real-world validation: visit an actual park, note real GPS readings
   at a few spots, compare to what the app predicts.

See CLAUDE.md's Definition of Done for Phase 0's exit criteria.

### Known gaps in Phase 0 (deferred, not forgotten)
Found while building the editor and field viewer; deliberately left for
later so they don't block the Definition of Done.
- **No re-fit on rotate/resize.** The photo is fitted and centred only
  when it loads (`viewport.reset()` in `photo-viewport.ts`), so rotating
  the phone or resizing the window leaves the view mis-fitted until the
  photo is reloaded.
- **Panning isn't bounded.** You can drag the photo entirely out of the
  panel. It should stop once a photo edge meets the panel edge (and the
  zoom-out re-centre should stay consistent with that).
- **localStorage's ~5 MB limit.** Large photos may not persist. Cloud
  storage is planned before public sharing, so this is accepted for now
  (see the decisions log in CLAUDE.md).
- **Unfriendly error on collinear anchors.** `computeTransform` does
  throw, but with the solver's raw "LU matrix is singular", which is what
  the field page would show. A clearer message can wait.

## Phase 1 — Mobile MVP (Expo/React Native/TypeScript)
Smallest real, usable app:
- Camera or photo-library capture of the map image
- The Phase 0 transform module, ported unchanged, with an in-app
  pinning UI (tap photo, tap real map)
- Live GPS dot rendered on the map image, updating as you move
- Local persistence only (on-device; no backend/accounts)
- Tested end-to-end on one real park, by me

## Explicitly out of scope for MVP (park for later)
- Crowdsourced/shared map library
- Route/trail recording, GPX export
- Offline tile caching beyond the single map photo
- iOS/Android parity polish
- Accounts, cloud sync, sharing
- Support for maps beyond parks (campuses, ski resorts, etc.) — revisit
  once the core works for the simplest case
