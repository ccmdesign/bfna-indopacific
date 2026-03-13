---
status: pending
priority: p3
issue_id: "BF-111"
tags: [code-review, quality, maintainability]
dependencies: []
---

# Six nearly identical embed HTML files could be generated from config

## Problem Statement

The 6 files in `public/embeds/mt-*.html` are identical except for the `latitude`, `longitude`, `zoom`, and `<title>` values. If any change is needed to the template (e.g., adding a `connect-src` CSP directive, changing the background color, or updating the MarineTraffic script URL), it must be made in all 6 files manually, creating a maintenance burden and risk of drift.

## Findings

- All 6 files share the same HTML structure, CSP meta tag, styles, and script pattern
- Only 4 values differ: title, latitude, longitude, zoom
- These values are already defined in `marinetraffic-config.ts`

## Proposed Solutions

### Option 1: Build-time generation from config

**Approach:** Create a build script or Nuxt module that generates the HTML files from `marinetraffic-config.ts` during `npm run generate`.

**Effort:** 1-2 hours
**Risk:** Low

### Option 2: Single parameterized HTML file with query params

**Approach:** Use one `mt-embed.html` that reads lat/lng/zoom from URL query params: `/embeds/mt-embed.html?lat=2.5&lng=101.0&zoom=7`

**Effort:** 30 minutes
**Risk:** Low

## Technical Details

**Affected files:**
- `public/embeds/mt-*.html` (6 files)
- `data/straits/marinetraffic-config.ts`

## Resources

- **PR:** #35

## Acceptance Criteria

- [ ] A single template or parameterized file replaces 6 duplicate files

## Work Log

### 2026-03-12 - Code Review Discovery

**By:** Claude Code (ce-review)
