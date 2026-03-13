---
status: resolved
priority: p3
issue_id: "BF-111"
tags: [code-review, quality, design-tokens]
dependencies: []
---

# Hardcoded RGBA colors in MarineTrafficEmbed fallback text

## Problem Statement

The `.mt-embed__fallback-text` style uses `color: rgba(255, 255, 255, 0.45)` and `.mt-embed__iframe` background color in the embed HTML files uses `#1a2744`. These should use design tokens from the project's CSS custom properties for consistency and theme-ability.

## Findings

- `components/straits/MarineTrafficEmbed.vue:101` — `rgba(255, 255, 255, 0.45)`
- `public/embeds/mt-*.html` — `background: #1a2744`
- The project uses CSS custom properties (e.g., `--color-accent`, `--size-*`) in `public/styles.css`

## Proposed Solutions

### Option 1: Replace with CSS custom properties

**Approach:** Use existing design tokens or define new ones for muted text and dark background.

**Effort:** 15 minutes
**Risk:** Low

## Technical Details

**Affected files:**
- `components/straits/MarineTrafficEmbed.vue:101`
- `public/embeds/mt-*.html` (isolated context, limited token access)

## Resources

- **PR:** #35

## Acceptance Criteria

- [ ] Vue component colors use design tokens
- [ ] Embed HTML files document why they use hardcoded values (isolated iframe context)

## Work Log

### 2026-03-12 - Code Review Discovery

**By:** Claude Code (ce-review)
