---
status: pending
priority: p3
issue_id: "BF-111"
tags: [code-review, quality, documentation]
dependencies: []
---

# Magic number maptype='0' in embed HTML files is undocumented

## Problem Statement

All 6 embed HTML files set `maptype='0'` as a MarineTraffic embed parameter. The meaning of this value is not documented in a code comment. Future maintainers won't know what `0` means or what alternatives are available (e.g., satellite view, dark mode).

## Findings

- All `public/embeds/mt-*.html` files have `maptype='0'`
- MarineTraffic embed docs indicate: `0` = normal, `1` = satellite, `4` = dark
- No comment explains the choice

## Proposed Solutions

### Option 1: Add inline comment

**Approach:** Add `/* 0=normal, 1=satellite, 4=dark */` next to the value.

**Effort:** 5 minutes
**Risk:** Low

## Technical Details

**Affected files:**
- `public/embeds/mt-*.html` (6 files)

## Resources

- **PR:** #35
- [MarineTraffic Embed Map Guide](https://www.marinetraffic.com/en/p/embed-map)

## Acceptance Criteria

- [ ] maptype value is documented with available options

## Work Log

### 2026-03-12 - Code Review Discovery

**By:** Claude Code (ce-review)
