---
status: pending
priority: p3
issue_id: "BF-110"
tags: [code-review, quality]
dependencies: []
---

# StraitCard thumbnailUrl uses fragile string manipulation to derive path

## Problem Statement

In `components/straits/StraitCard.vue`, the `thumbnailUrl` computed property derives the thumbnail path by splitting `imageUrl` on `/`, taking the last segment, replacing `.webp` with empty string, and prepending a different path with `.jpg` extension. This is fragile: if `imageUrl` ever uses a different extension, different path structure, or the thumbs directory naming convention changes, the derivation breaks silently (returning a wrong path that 404s).

## Findings

- `StraitCard.vue:23-26` — `const name = props.strait.imageUrl.split('/').pop()?.replace('.webp', '') ?? ''`
- Returns `/assets/straits/thumbs/${name}.jpg`
- No fallback or error handling if the derived URL 404s
- The `v-if="thumbnailUrl"` guard only checks for undefined `imageUrl`, not whether the derived path is valid

## Proposed Solutions

### Option 1: Add thumbnail URL directly to the Strait data type

**Approach:** Add a `thumbnailUrl` field to the `Strait` interface populated at data load time.

**Pros:**
- No runtime string manipulation
- Single source of truth for thumbnail paths

**Cons:**
- Requires data schema change

**Effort:** Small
**Risk:** Low

### Option 2: Accept with onerror fallback on img

**Approach:** Add `@error` handler on the `<img>` to hide it if the thumbnail 404s.

**Effort:** Small
**Risk:** Low

## Technical Details

**Affected files:** `components/straits/StraitCard.vue`

## Acceptance Criteria

- [ ] Thumbnail derivation is robust or has a visible fallback on failure

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-11 | Created | Code review of PR #34 (BF-110) |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/34
