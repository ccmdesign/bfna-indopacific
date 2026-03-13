---
status: resolved
priority: p2
issue_id: "BF-111"
tags: [code-review, performance, mobile]
dependencies: []
---

# Mobile MarineTraffic embed loads immediately with no user intent signal

## Problem Statement

In `StraitMobileDetail.vue`, the MarineTraffic embed is rendered unconditionally as part of the detail view. On mobile devices with limited bandwidth, this immediately starts loading a third-party iframe with map tiles, JavaScript, and network connections even if the user only wants to read the text content. Unlike desktop where the embed only loads when a circle is clicked (selected), the mobile embed loads as soon as the detail page is navigated to.

## Findings

- `components/straits/StraitMobileDetail.vue` adds the embed at line 423-427 with no gating condition
- The `loading="lazy"` attribute on the iframe provides some deferral but only based on viewport intersection, not user intent
- On a typical mobile connection, MarineTraffic map tiles can consume 1-3MB of data

## Proposed Solutions

### Option 1: Add "Tap to load live traffic" interaction gate

**Approach:** Show a placeholder with the satellite background image and a "Tap to view live traffic" button. Only mount the iframe when the user explicitly requests it.

**Pros:**
- Respects mobile data budgets
- Clear user intent signal
- Consistent with how Google Maps embeds work on mobile

**Cons:**
- Extra tap required

**Effort:** 30 minutes

**Risk:** Low

### Option 2: Use IntersectionObserver to defer loading

**Approach:** Only mount the iframe when the embed container scrolls into view.

**Pros:**
- Automatic, no user action needed
- Saves data if user doesn't scroll that far

**Cons:**
- Still loads without explicit user intent

**Effort:** 20 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `components/straits/StraitMobileDetail.vue:423-427`

## Resources

- **PR:** #35

## Acceptance Criteria

- [ ] Mobile embed does not load MarineTraffic iframe until user interaction or scroll
- [ ] Satellite background image shows as placeholder

## Work Log

### 2026-03-12 - Code Review Discovery

**By:** Claude Code (ce-review)
