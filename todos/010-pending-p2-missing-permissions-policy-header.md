---
status: resolved
priority: p2
issue_id: "010"
tags: [code-review, security, headers, BF-70]
dependencies: []
---

# Missing `Permissions-Policy` Header on Embed Routes

## Problem Statement

The plan document's Enhancement Summary explicitly states: "Added `Referrer-Policy` and `Permissions-Policy` headers for embed routes." The `Referrer-Policy` header was implemented in `netlify.toml`, but the `Permissions-Policy` header was omitted from the actual implementation. This header restricts which browser features (camera, microphone, geolocation, fullscreen, etc.) embedded content can access, providing defense-in-depth for iframe security.

**Why it matters:** Without `Permissions-Policy`, embedded infographic iframes inherit the embedding page's feature permissions. While the current infographic content does not use any restricted APIs, adding this header is a security best practice that prevents future code changes from inadvertently accessing sensitive browser features. The plan committed to including it, so this is an implementation gap.

## Findings

- **Location:** `netlify.toml`, lines 12-19 (embed route headers block)
- **Evidence:** The `[[headers]]` block for `/embed/*` includes `Content-Security-Policy`, `X-Frame-Options`, `X-XSS-Protection`, `X-Content-Type-Options`, and `Referrer-Policy` -- but no `Permissions-Policy`.
- **Plan reference:** Plan Enhancement Summary item #5: "Added `Referrer-Policy` and `Permissions-Policy` headers for embed routes, and documented why `X-Frame-Options` should be kept as a legacy fallback alongside `frame-ancestors`."
- **Agent:** security-sentinel
- **Impact:** Low immediate risk (infographics do not use restricted APIs), but creates an implementation gap versus the plan and misses a security hardening opportunity.

## Proposed Solutions

### Option 1: Add a restrictive `Permissions-Policy` header to embed routes
- **Pros:** Matches the plan, provides defense-in-depth, prevents future feature misuse
- **Cons:** None meaningful -- the infographics do not need any restricted features
- **Effort:** Small (add 1 line to netlify.toml)
- **Risk:** None -- restricting features the app does not use has no functional impact
- **Example:** `Permissions-Policy = "camera=(), microphone=(), geolocation=(), fullscreen=(self)"`

### Option 2: Skip Permissions-Policy for now, update plan to reflect the decision
- **Pros:** No code change needed
- **Cons:** Plan/implementation mismatch persists; misses a low-effort security win
- **Effort:** Small (update plan document)
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `netlify.toml`
- **Components:** Netlify header configuration for `/embed/*` routes
- **Database changes:** None

## Acceptance Criteria

- [ ] `Permissions-Policy` header is present on `/embed/*` routes in `netlify.toml` (or plan is updated to remove the commitment)
- [ ] `curl -I https://<site>/embed/<page>` returns a `Permissions-Policy` header
- [ ] No regression to other headers on embed or non-embed routes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #7 code review | Plan committed to Permissions-Policy but implementation omitted it |
| 2026-03-03 | Resolved: added `Permissions-Policy = "camera=(), microphone=(), geolocation=(), fullscreen=(self)"` to `/embed/*` headers in `netlify.toml` | Matches plan commitment; restricts features the app does not use |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/7
- File: `netlify.toml` lines 12-19
- Plan: `docs/plans/2026-03-03-feat-create-embed-layout-plan.md`, Enhancement Summary item #5
- MDN Permissions-Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy
