# Project: [Working name TBD] — Park Map GPS Navigator

## What this is
A mobile app: photograph a physical park/trail map, pin a few reference
points against a real map, and get your live GPS position overlaid on
the photographed map. Built primarily to learn React Native/Expo +
TypeScript and to practice working with an AI coding agent — not
(primarily) to chase a competitive product. See `/docs/goals.md` for
the full context and priority order.

## Current phase
**Phase 0 — web prototype of the core alignment logic.**
Goal: prove that a photographed map + 3–4 reference points can be
transformed into an accurate real-world coordinate mapping, before any
mobile/camera/GPS plumbing exists. See `/docs/mvp-scope.md` for the
phase breakdown and what's explicitly out of scope right now.

Do not start Phase 1 (React Native app) work until Phase 0's transform
module is validated against a real walk-test (see Definition of Done
below).

## Stack
- Phase 0: plain TypeScript + Leaflet/OpenStreetMap, static site, no
  backend. Runs in-browser for fast iteration.
- Phase 1+: Expo (React Native) + TypeScript, `expo-camera`,
  `expo-location`. The Phase 0 transform module should be imported
  as-is, not rewritten.
- No backend/accounts/cloud sync in MVP. Local persistence only.

## Working rules for Claude Code

1. **Explain before big changes.** For anything beyond a small fix,
   describe the approach in plain terms before writing code. I'm
   learning this stack — narrate non-obvious API choices and
   TypeScript patterns as you go, don't just produce working code
   silently.
2. **Small, reviewable commits.** One logical change per commit; don't
   bundle unrelated changes. See *Git workflow* below for message
   format and merge strategy.
3. **Stay in scope.** Don't add features, abstractions, or "nice to
   have while I'm in here" changes beyond what was asked. Flag ideas
   instead of implementing them unprompted.
4. **Ask before adding a dependency.** New npm packages, especially
   anything beyond the Expo-managed ecosystem, get flagged first with
   a one-line reason.
5. **Tests for the math, not for everything.** The coordinate
   transform logic (Phase 0 core) needs unit tests with known
   input/output pairs. UI code doesn't need the same rigor at this
   stage.
6. **No premature mobile-ification.** While in Phase 0, don't
   introduce React Native-specific code or Expo config — keep it a
   plain web/TS project until the phase's Definition of Done is met.
7. **Surface uncertainty.** If there are multiple reasonable ways to
   do something (e.g., which transform library, how to structure the
   pinning UI state), briefly present the options and a recommendation
   rather than silently picking one.
8. **Log setup/scaffolding commands.** When asked to run setup or
   scaffolding commands, run them, confirm they succeeded, and only
   then append a dated entry to `docs/setup-log.md` following its
   existing format. Log the commands as actually run (including any
   correction after a failed attempt), not the first thing tried —
   the log is a reproducibility record, not a trial-and-error
   transcript. Don't log anything until it has actually succeeded.

## Git workflow

### Commit messages
Use [Conventional Commits](https://www.conventionalcommits.org/): a
type prefix, an optional scope, and a short imperative summary:

```
feat(transform): compute inverse affine matrix
fix(ui): correct pin drag offset on retina displays
docs: add walk-test results to Definition of Done
refactor(transform): extract solveAffine into its own module
test(transform): add synthetic round-trip cases
chore: update vitest to 1.x
```

This applies to every commit — ones Claude Code makes on your behalf
and ones you write yourself.

### Commit size
One logical change per commit (reinforces rule #2). If a change
touches both the transform module and the UI, split it into two
commits.

### Merge strategy
Always use `--no-ff -m` — never fast-forward:

```sh
git merge --no-ff -m "chore: merge <branch> into main" <branch>
```

Keeps branch topology visible in the log. Claude Code will follow
this when creating merge commits on your behalf.

### Authorship and AI attribution

Keep me as the Git `Author` for all commits. I review the final change and take responsibility for what is committed.

When an AI model makes a substantial contribution to a commit, add a `Co-Authored-By:` trailer to the commit message identifying the actual model that contributed.

Use these rules:

* Add AI co-authorship whenever the model wrote, rewrote, or materially shaped a non-trivial part of the committed implementation.
* Add AI co-authorship when the model supplied an algorithm, architecture, data model, API design, debugging solution, or other substantive technical approach that was incorporated into the commit, even if I later edited the resulting code.
* Add AI co-authorship when I primarily directed, reviewed, tested, or refined code that the model substantially produced.
* Do not omit attribution merely because I modified, reformatted, renamed, reorganized, or partially rewrote AI-generated code before committing it.
* Do not add AI co-authorship for genuinely minor assistance, such as explanations, documentation lookup, code review without substantive changes, trivial debugging hints, formatting, naming suggestions, or isolated small edits.
* When it is genuinely unclear whether the contribution was substantial, prefer adding the `Co-Authored-By:` trailer.
* If multiple AI models contributed substantially, add a separate `Co-Authored-By:` trailer for each.
* Identify the actual backend model that made the contribution, not merely the frontend, agent, editor, or tool through which it was accessed.
* Do not replace me as the Git `Author`, even if most or all of the implementation was generated by an AI model.

Example:

```text
feat(transform): compute inverse affine matrix

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

The purpose of this convention is to make substantial AI contribution visible in commit history while keeping responsibility for the committed change with me.

## Definition of Done — Phase 0

### Editor (index.html — laptop)
- [x] Upload a map photo, pin 3+ reference points against an embedded
      Leaflet map
- [x] Verify fit via live synced cursors on both maps
- [x] Export a JSON bundle: map photo embedded as a data URL + anchor
      pairs with pixel coordinates in the image's natural resolution
- [x] Import a JSON bundle back into the editor to verify the
      round-trip (photo, pairs, and transform all restored correctly)

### Transform module
- [x] Affine transform: computes from 3+ reference pairs
      (least-squares), inverts analytically, projects in both
      directions
- [x] Unit tests with synthetic cases; module is free of
      UI/Leaflet/DOM dependencies and ready to import unchanged into
      Phase 1

### Field viewer (field.html — phone)
- [ ] Imports the JSON bundle and shows a live GPS dot on the photo;
      no Leaflet, no tile loading
- [ ] Deployed over HTTPS (Vercel or Netlify) so the Geolocation API
      works on the phone

### Field test
- [ ] At the park: check the dot at 3+ spots not used as anchors,
      document the error margin

## Open questions / decisions log
(Keep this updated as decisions get made — helps future-you and future
Claude Code sessions understand *why*, not just *what*.)
- Similarity vs. affine transform: affine chosen by default to handle
  non-uniform map distortion ("artistic errors" in hand-drawn maps);
  revisit if Phase 0 testing shows it overfits with only 3 points.
- Two-page structure (editor + field viewer): the editor (index.html)
  runs on a laptop with Leaflet for anchor placement; the field viewer
  (field.html) runs on a phone with no Leaflet or tile loading, keeping
  it light. The split also keeps each page's code simple, and the field
  viewer previews the core Phase 1 screen — a photo with a live GPS dot
  and nothing else.
- Bundle storage is localStorage for now (~5 MB per origin): both pages
  keep the whole bundle, photo included as a data URL, under one shared
  key. A full-resolution photo can exceed that quota; the pages show a
  "could not save" note instead of failing. Accepted for Phase 0 — cloud
  storage will be added before the project is shared publicly, so no
  compression/chunking workaround is planned. See "Known gaps" in
  `docs/mvp-scope.md`.
