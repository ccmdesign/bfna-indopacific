---
status: pending
priority: p2
issue_id: "017"
tags: [code-review, security, headers, netlify]
dependencies: []
---

# Missing Security Headers on Catch-All Route

## Problem Statement

The `/*` catch-all header block in `netlify.toml` is missing `Referrer-Policy` and `Permissions-Policy` headers that are present on the `/embed/*` block. This means non-embed routes (the main site) have weaker security headers than the embed routes, which is the inverse of what is expected. Non-embed routes handle user-facing content and should have at least equivalent security posture.

**Why it matters:** Security scanners and best-practice audits will flag the missing `Referrer-Policy` and `Permissions-Policy` on the main site routes. The `Referrer-Policy` controls how much referrer information is leaked to external links, and `Permissions-Policy` restricts access to browser APIs (camera, microphone, geolocation). Both are standard security hardening headers recommended by OWASP and Mozilla Observatory.

## Findings

- **File:** `netlify.toml`, lines 21-27
- **Evidence:** The `/embed/*` block (lines 12-19) includes 5 security headers: `Content-Security-Policy`, `X-XSS-Protection`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. The `/*` block (lines 22-27) includes only 3: `X-Frame-Options`, `X-XSS-Protection`, `X-Content-Type-Options`.
- **Source agent:** security-sentinel, architecture-strategist
- **Note:** This asymmetry pre-dates PR #9 but is surfaced here because the PR modifies the header configuration and is the natural place to address it.

## Proposed Solutions

### Option A: Add missing headers to catch-all block
**Pros:** Simple, consistent security posture across all routes, aligns with best practices.
**Cons:** Slightly larger header payload on every response (negligible).
**Effort:** Small
**Risk:** Low

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), fullscreen=(self)"
```

### Option B: Leave as-is and address in a separate PR
**Pros:** Keeps PR #9 minimal and focused.
**Cons:** Security gap persists until addressed.
**Effort:** N/A (deferred)
**Risk:** Low (the missing headers are defense-in-depth, not critical)

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `netlify.toml`
- **Affected components:** HTTP response headers for all non-embed routes
- **Database changes:** None

## Acceptance Criteria

- [ ] `/*` routes include `Referrer-Policy: strict-origin-when-cross-origin` header
- [ ] `/*` routes include `Permissions-Policy: camera=(), microphone=(), geolocation=(), fullscreen=(self)` header
- [ ] Verified via `curl -sI` on deploy preview

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Identified during PR #9 code review | Header asymmetry between route blocks |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/9
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
