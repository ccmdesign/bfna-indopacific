---
title: "feat: Update Netlify headers for embed routes"
type: feat
status: active
date: 2026-03-03
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
---

# feat: Update Netlify headers for embed routes

## Overview

Configure path-specific HTTP headers in `netlify.toml` so that `/embed/*` routes allow iframe embedding from any domain, while all other routes continue to deny framing via `X-Frame-Options: DENY`. This is a prerequisite for the embeddable infographics feature described in the brainstorm (see brainstorm: `docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md`).

## Problem Statement / Motivation

The site currently ships a global `X-Frame-Options: DENY` header on all routes, which prevents any page from being loaded inside an `<iframe>`. The embed feature requires `/embed/*` pages to be frameable by third-party websites so that partner organisations can embed BFNA infographics on their own sites.

The current `netlify.toml` already has a partial implementation of the path-specific header split (the `/embed/*` rule exists before the `/*` catch-all). However, the `/embed/*` rule currently sets `X-Frame-Options: SAMEORIGIN`, which still blocks cross-origin embedding in older browsers and contradicts the brainstorm decision that embeds should be "open to all domains" (see brainstorm: Key Decisions > Embed Security).

## Proposed Solution

Update the `/embed/*` header block in `netlify.toml` to:

1. **Remove the `X-Frame-Options` header entirely** from the `/embed/*` rule -- do not set it at all, rather than setting it to `SAMEORIGIN`. This ensures no browser (old or new) blocks cross-origin framing based on this header.
2. **Keep `Content-Security-Policy: frame-ancestors *`** on `/embed/*` routes. In modern browsers, `frame-ancestors` is the authoritative framing directive and supersedes `X-Frame-Options`. Setting `frame-ancestors *` allows embedding from any origin.
3. **Keep `X-Frame-Options: DENY`** on the `/*` catch-all rule to protect all non-embed routes from clickjacking.
4. **Preserve all other security headers** (`X-XSS-Protection`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) on both rule sets.

### Target `netlify.toml` headers section

```toml
# netlify.toml

# Embed routes: allow iframe embedding from any origin via CSP frame-ancestors
# MUST appear BEFORE the /* catch-all rule (Netlify processes first match)
[[headers]]
  for = "/embed/*"
  [headers.values]
    Content-Security-Policy = "frame-ancestors *"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), fullscreen=(self)"

# All other routes: deny iframe embedding
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

**Key difference from current state:** The `X-Frame-Options = "SAMEORIGIN"` line is removed from the `/embed/*` block. No other lines change.

## Technical Considerations

### Header precedence: `frame-ancestors` vs `X-Frame-Options`

Modern browsers (Chrome 40+, Firefox 35+, Safari 10+, Edge 15+) follow the CSP Level 2 spec: when `frame-ancestors` is present, `X-Frame-Options` is ignored. By omitting `X-Frame-Options` from the embed rule entirely and relying solely on `frame-ancestors *`, we get:

- **Modern browsers:** `frame-ancestors *` allows framing from any origin. No conflict.
- **Older browsers (pre-CSP L2):** Without an `X-Frame-Options` header, the default browser behavior is to allow framing. This is the desired outcome for embeds.

If we kept `X-Frame-Options: SAMEORIGIN` alongside `frame-ancestors *`, older browsers would only allow same-origin framing, defeating the purpose.

### Netlify header rule ordering

Netlify processes `[[headers]]` blocks top-to-bottom and applies the **first matching** rule. The `/embed/*` block must remain above the `/*` catch-all. This is already the case in the current file and must be preserved. A comment in the file documents this requirement.

### No application code changes required

This change is entirely in `netlify.toml`. No Vue components, layouts, Nuxt config, or JavaScript need to change. The embed pages (`pages/embed/renewables.vue`) already use the `embed` layout and are pre-rendered via `nitro.prerender.routes` in `nuxt.config.ts`.

### Security posture

- Non-embed routes remain protected by `X-Frame-Options: DENY` (clickjacking prevention).
- Embed routes intentionally allow framing but retain all other security headers (`X-XSS-Protection`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- Embed pages already set `<meta name="robots" content="noindex, nofollow">` to prevent search engine indexing.

## Acceptance Criteria

- [ ] `/embed/*` routes do NOT send an `X-Frame-Options` response header
- [ ] `/embed/*` routes send `Content-Security-Policy: frame-ancestors *`
- [ ] `/embed/*` routes send `X-XSS-Protection`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` headers
- [ ] `/*` routes (non-embed) send `X-Frame-Options: DENY`
- [ ] `/*` routes send `X-XSS-Protection` and `X-Content-Type-Options` headers
- [ ] An iframe on a different domain can successfully load `/embed/renewables`
- [ ] An iframe on a different domain is blocked from loading `/` or any non-embed route
- [ ] The `/embed/*` header block appears BEFORE the `/*` catch-all in `netlify.toml`

## Verification Plan

### Local verification

1. Run `npm run generate` to confirm static build succeeds with no changes to application code.
2. Inspect the generated `netlify.toml` or the source file to confirm the header block matches the target above.

### Deploy preview verification

After deploying to a Netlify preview branch:

1. **Check response headers** on an embed route:
   ```bash
   curl -sI https://<preview-url>/embed/renewables | grep -iE '(x-frame-options|content-security-policy)'
   ```
   Expected: `Content-Security-Policy: frame-ancestors *` only. No `X-Frame-Options`.

2. **Check response headers** on a non-embed route:
   ```bash
   curl -sI https://<preview-url>/ | grep -iE '(x-frame-options|content-security-policy)'
   ```
   Expected: `X-Frame-Options: DENY`.

3. **Cross-origin iframe test** -- create a simple HTML page on a different origin that embeds the preview URL:
   ```html
   <iframe src="https://<preview-url>/embed/renewables" width="1280" height="800"></iframe>
   ```
   Expected: Infographic loads and renders correctly inside the iframe.

4. **Negative test** -- attempt to iframe a non-embed route:
   ```html
   <iframe src="https://<preview-url>/" width="1280" height="800"></iframe>
   ```
   Expected: Browser blocks the frame (shows blank or error in console).

## File Changes

| File | Change |
|------|--------|
| `netlify.toml` | Remove `X-Frame-Options = "SAMEORIGIN"` from the `/embed/*` header block (line 16). No other changes. |

## Dependencies & Risks

- **Zero risk of breaking non-embed routes** -- the `/*` catch-all block is untouched.
- **Dependency:** Netlify deploy preview (or production deploy) required to fully verify headers, since `nuxi dev` does not serve Netlify headers.
- **Low risk:** Removing `X-Frame-Options` from embed routes is intentional. The `frame-ancestors *` CSP directive provides the modern equivalent protection model while allowing all-origin embedding.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md](../brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md) -- Key decisions carried forward: (1) embed routes open to all domains with no `X-Frame-Options` restriction, (2) path-specific header rules in `netlify.toml`, (3) `frame-ancestors *` as the CSP directive for embed routes.

### External References

- [MDN: X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options) -- documents deprecation in favour of `frame-ancestors`
- [MDN: CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors) -- modern standard for framing control
- [OWASP Clickjacking Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html) -- recommends using both headers for backward compatibility (we intentionally omit `X-Frame-Options` on embed routes to allow cross-origin framing)
- [Netlify Custom Headers Docs](https://docs.netlify.com/manage/routing/headers/) -- path matching and rule ordering
- [CSP frame-ancestors vs X-Frame-Options](https://centralcsp.com/articles/frame-ancestor-frame-options) -- precedence behaviour in modern vs older browsers
