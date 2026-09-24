# Setup Log

Chronological record of setup/scaffolding commands run for this
project, in the order they were run. This is a log, not a tutorial —
see the README's "Getting started" section for the clean, current
instructions once those exist.

Each entry: date, what was done, the exact command(s), and a one-line
why if it's not obvious.

---

## 2026-09-23 — Phase 0 scaffold: Vite + TypeScript + Leaflet

Set up the Phase 0 web prototype per `docs/mvp-scope.md`.

```
npm create vite@latest phase0 -- --template vanilla-ts
```
(answered "No" to the "Install with npm and start now?" prompt)
```
cd phase0
npm install
npm install leaflet
npm install -D @types/leaflet
```

## 2026-09-24 — Phase 0: clean up Vite starter template

- Ran `npm run dev`, verified the default Vite/TypeScript starter page
  loaded correctly, confirmed hot reload worked
- Stopped the dev server
- Deleted demo files: `src/counter.ts`, `src/style.css`,
  `src/assets/vite.svg`, `src/assets/typescript.svg`,
  `src/assets/hero.png`, `public/icons.svg`.
- Replaced `src/main.ts` contents with a minimal placeholder
- Re-ran `npm run dev` to confirm the cleaned-up version still builds
  with no errors

## 2026-09-24 — Phase 0: add Vitest for unit testing

```
cd phase0
npm install -D vitest
```

Added a `test` script to `phase0/package.json`: `vitest run`.

## 2026-09-24 — Phase 0: add leaflet-geosearch for map location search

```
cd phase0
npm install leaflet-geosearch
```

Used in `src/main.ts` to add an `OpenStreetMapProvider`-backed
`GeoSearchControl` to the Leaflet map (no API key required).

## 2026-09-24 — Phase 0: add ml-matrix for least-squares solver

```
cd phase0
npm install ml-matrix
```

Used by `src/transform.ts` to solve the overdetermined affine system
via normal equations.

## 2026-09-24 — Phase 0: multi-page build config for field.html

No install commands. Added `phase0/vite.config.ts` by hand, listing
`index.html` (editor) and `field.html` (field viewer) under
`build.rolldownOptions.input`. Vite's dev server serves any root-level
`.html` automatically, but `vite build` only bundles the pages listed
here. (Vite 8 uses `rolldownOptions`; `rollupOptions` is deprecated.)

Verified:

```
cd phase0
npm run build
```

`dist/` contains both `index.html` and `field.html`.