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
cd phase0
npm install
npm install leaflet
npm install -D @types/leaflet
```
