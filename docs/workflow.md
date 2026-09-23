# Zhenya's Workflow — Park Map GPS App

Personal operating manual: how I work on this project. This is *my*
process, not instructions for the agent (see `CLAUDE.md` for that).

Priorities driving every decision below (see `docs/goals.md`):
1. Learn TypeScript / React Native / Expo
2. Learn to vibe-code effectively
3. End up with an app I'd use

## Division of labor: Claude (chat) vs. Claude Code

**Discuss with Claude (chat) first:**
- Architecture and design decisions before they become code — e.g.
  "should the transform be similarity or affine," "how should pinning
  state be structured," anything with real tradeoffs.
- Anything I don't understand yet. If Claude Code produces something
  I can't explain back in my own words, that's a signal to stop and
  ask chat *why* it works, not just move on.
- Scoping/re-scoping: when a phase's Definition of Done needs
  revisiting, decide that here, then update `docs/mvp-scope.md` and
  `CLAUDE.md` accordingly.
- Debugging *strategy* when stuck (what to try next), separate from
  Claude Code doing the actual debugging.

**Delegate to Claude Code:**
- Implementation once the approach is decided.
- Boilerplate, config, wiring up libraries (Leaflet, Expo modules).
- Writing tests for logic that's already designed.
- Mechanical refactors.

**Rule of thumb:** if I can describe *what* I want in a sentence and
don't care much about *how*, that's Claude Code. If I need to think
through *how* or *whether*, that's chat first.

## Code review habits

Since goal #1 is learning, reviewing on autopilot defeats the point.
For every Claude Code change, before accepting:

- [ ] Can I explain what this code does, line by line, to someone
      else? If not, ask chat or Claude Code to explain the unfamiliar
      part before moving on.
- [ ] Does this match the approach I actually decided on, or did the
      agent quietly make a different choice? (Diff against my mental
      model, not just "does it run.")
- [ ] Is it in scope, per `CLAUDE.md`'s scope rule? Flag and roll back
      anything extra, even if it looks nice.
- [ ] For the transform math specifically: do the unit tests cover a
      case I'd actually trust? Don't accept "tests pass" without
      reading what they assert.
- [ ] Would I be comfortable explaining this file in a job interview?
      (Portfolio-goal check — see `docs/goals.md`.)

Don't rubber-stamp large diffs. If a change is big enough that I can't
review it properly in one sitting, that's a sign to have asked for
smaller commits (per `CLAUDE.md` rule #2) — say so and ask for a
smaller version.

## Session rhythm

- Start of a work session: skim `CLAUDE.md`'s "Current phase" and
  "Definition of Done" so I know what today's work should move toward.
- End of a work session: update the "Open questions / decisions log"
  in `CLAUDE.md` with anything decided, and check off any Definition
  of Done items completed.
- Don't start Phase 1 work until Phase 0's Definition of Done is
  fully checked — resist the pull to jump ahead to the "fun" mobile
  part before the core logic is proven.

## Signals I'm optimizing for the wrong priority

Watch for these — they mean I've slipped from "learning" mode into
"ship it" mode, which is fine occasionally but shouldn't be the
default given the stated priority order:

- Accepting Claude Code output I don't fully understand because it's
  faster than asking.
- Skipping the "explain before big changes" step in `CLAUDE.md`
  because I'm in a hurry.
- Adding scope (features, polish) because it'd be nice to use, at the
  expense of stack fundamentals I haven't actually practiced yet.
