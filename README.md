# Park Map GPS Navigator *(working name)*

Photograph a physical park or trail map, pin a few reference points,
and see your live GPS position overlaid on that photo — even with no
signal and no pre-existing digital map of the area.

## Why this exists

Two goals drive this project, in priority order:

1. **Learning** — TypeScript, React Native/Expo, and mobile
   development (camera, GPS, geospatial math) from close to scratch.
2. **Learning to work effectively with an AI coding agent** (Claude
   Code) — good delegation, real code review, staying in scope.

Ending up with an app I'd actually use is a nice-to-have, not the
main point. See [`docs/goals.md`](docs/goals.md) for the full context.

## Current status

**Phase 0** — building and validating the core map-alignment logic
(photo + reference points → real-world coordinate transform) as a
standalone web prototype, before any mobile app code exists.

See [`docs/mvp-scope.md`](docs/mvp-scope.md) for the full phase
breakdown, and [`CLAUDE.md`](CLAUDE.md) for the current Definition of
Done.

## Stack

- **Phase 0:** TypeScript + Leaflet/OpenStreetMap, static site, no
  backend
- **Phase 1+:** Expo (React Native) + TypeScript, `expo-camera`,
  `expo-location`

## Project docs

- [`CLAUDE.md`](CLAUDE.md) — context and working rules for Claude Code
- [`docs/goals.md`](docs/goals.md) — project goals and priorities
- [`docs/mvp-scope.md`](docs/mvp-scope.md) — phase-by-phase feature scope
- [`docs/workflow.md`](docs/workflow.md) — my own process for
  discussing/delegating/reviewing this project

## Getting started

*(To be filled in once Phase 0 is scaffolded.)*
