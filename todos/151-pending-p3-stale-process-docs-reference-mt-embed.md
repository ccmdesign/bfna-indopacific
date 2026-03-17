---
status: pending
priority: p3
issue_id: "BF-112"
tags: [code-review, quality]
dependencies: []
---

# Process docs still reference removed MarineTraffic embed code

## Problem Statement

The file `_process/embed.md` contains 6 MarineTraffic embed HTML snippets (one per strait) that reference `marinetraffic.com/js/embed.js`. These snippets are no longer relevant since the embed integration was removed. Similarly, `docs/plans/BF-111-marinetraffic-embeds.md` is a historical plan document -- this one is expected to remain as a record of past work and should NOT be deleted (it's a protected artifact).

The `_process/embed.md` file, however, may cause confusion if someone uses it as a reference for future embed work.

## Findings

- `_process/embed.md` contains 6 inline `<script>` snippets loading `marinetraffic.com/js/embed.js`
- `_process/braindump.md` contains MarineTraffic URLs as reference links (informational, not code)
- `docs/plans/BF-111-marinetraffic-embeds.md` is a protected artifact (plan document) and should remain

## Proposed Solutions

### Option 1: Archive _process/embed.md

**Approach:** Move `_process/embed.md` to `_archive/` or add a note at the top marking it as obsolete.

**Pros:**
- Prevents confusion
- Preserves history

**Cons:**
- Minor housekeeping

**Effort:** 5 minutes

**Risk:** None

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `_process/embed.md`
- `_process/braindump.md` (informational only)

## Resources

- **PR:** #36
- **Related:** BF-112

## Acceptance Criteria

- [ ] `_process/embed.md` is either archived or annotated as obsolete

## Work Log

### 2026-03-17 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified stale process documentation referencing removed MT embed code
- Confirmed docs/plans/ files are protected and should remain
