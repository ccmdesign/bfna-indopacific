---
status: resolved
priority: p3
issue_id: "022"
tags: [code-review, security, netlify, BF-72]
dependencies: []
---

# `X-Frame-Options: SAMEORIGIN` Conflicts with `frame-ancestors *` on Embed Routes

## Problem Statement

In `netlify.toml`, the `/embed/*` header block sets both `Content-Security-Policy: frame-ancestors *` (allow embedding from any origin) and `X-Frame-Options: SAMEORIGIN` (allow embedding only from the same origin). These two directives contradict each other. Modern browsers prioritize CSP `frame-ancestors` over `X-Frame-Options`, so cross-origin embedding works in Chrome/Firefox/Safari. However, older browsers that do not support CSP Level 2 will enforce `X-Frame-Options: SAMEORIGIN` and block third-party iframe embedding.

**Why it matters:** This is a pre-existing issue (introduced in a prior PR), but it directly affects the new `/embed/straits` route added in this PR. If BFNA partners or third-party sites attempt to embed the straits infographic, older browsers will block it.

## Findings

- **Location:** `netlify.toml` lines 13-19
- **Evidence:** Same header block contains `Content-Security-Policy = "frame-ancestors *"` and `X-Frame-Options = "SAMEORIGIN"`
- **Agent:** security-sentinel
- **Impact:** Low -- only affects legacy browsers; all modern browsers respect CSP frame-ancestors

## Proposed Solutions

### Option 1: Remove `X-Frame-Options` from embed routes
- Delete the `X-Frame-Options = "SAMEORIGIN"` line from the `/embed/*` header block. CSP `frame-ancestors` provides the same (and better) protection.
- **Pros:** No contradiction; consistent embedding behavior across all browsers
- **Cons:** Very old browsers without CSP support will have no frame protection (but they also wouldn't have CSP protection either)
- **Effort:** Trivial
- **Risk:** None

### Option 2: Change to `X-Frame-Options: ALLOWALL`
- This is a non-standard value but some older browsers recognize it.
- **Pros:** Attempts to allow embedding in legacy browsers
- **Cons:** Non-standard; not widely supported; may be ignored
- **Effort:** Trivial
- **Risk:** Low

### Option 3: Leave as-is
- Accept the contradiction. Modern browsers handle it correctly.
- **Pros:** No change needed; defense-in-depth argument
- **Cons:** Contradictory headers are a code smell; may confuse security auditors
- **Effort:** None
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `netlify.toml`
- **Components:** HTTP security headers
- **Database changes:** None

## Acceptance Criteria

- [ ] Embed routes allow iframe embedding from any origin in both modern and legacy browsers
- [ ] Non-embed routes still deny iframe embedding
- [ ] Security headers are consistent and non-contradictory

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #10 code review | Pre-existing header contradiction; affects new /embed/straits route |

## Resources

- **PR:** https://github.com/ccmdesign/bfna-indopacific/pull/10
- **MDN:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
- **Files:** `netlify.toml`
