---
status: wont_fix
priority: p3
issue_id: "BF-104"
tags: [code-review, performance, bundle-size]
dependencies: []
---

# Large polygon JSON files (~980KB total) loaded via dynamic import

## Problem Statement

Six polygon JSON files totaling ~980KB (104K lines) are loaded via dynamic `import()`. While Vite code-splits these, each is still a sizable chunk (104KB-224KB per strait). For mobile users on slow connections, loading a polygon when selecting a strait could cause a noticeable delay before particles appear.

## Findings

- `data/straits/bab-el-mandeb-polygon.json` — 104KB
- `data/straits/hormuz-polygon.json` — 120KB
- `data/straits/lombok-polygon.json` — 180KB
- `data/straits/luzon-polygon.json` — 176KB
- `data/straits/malacca-polygon.json` — 224KB
- `data/straits/taiwan-polygon.json` — 176KB
- Total: ~980KB raw JSON
- Dynamic import in `useParticleFlow.ts:198` ensures only the active strait is loaded
- JSON files contain highly detailed polygon boundaries that could potentially be simplified

## Proposed Solutions

### Option 1: Simplify polygons (reduce vertex count)

**Approach:** Use Douglas-Peucker or similar simplification on the polygon boundaries to reduce file sizes by 50-80%.

**Pros:**
- Significant size reduction
- Particles don't need sub-pixel boundary precision

**Cons:**
- Requires preprocessing step
- Slight visual difference in particle containment

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Compress and serve from public/

**Approach:** Move to `public/` directory and rely on Netlify's gzip/brotli compression. Fetch via `$fetch` instead of `import()`.

**Pros:**
- Better caching (CDN edge cache)
- Compressed transfer size much smaller

**Cons:**
- Changes loading mechanism

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `data/straits/*-polygon.json` — all 6 polygon files
- `composables/useParticleFlow.ts:196-204` — polygon loading

## Resources

- **PR:** #32

## Acceptance Criteria

- [ ] Polygon load time under 500ms on 3G connection
- [ ] Particle containment accuracy maintained

## Work Log

### 2026-03-09 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Measured polygon file sizes
- Assessed bundle impact for mobile users
