# Browser Test Report — PR #9 (BF-75)

**Date:** 2026-03-03
**PR:** https://github.com/ccmdesign/bfna-indopacific/pull/9
**Branch:** feature/BF-75-update-netlify-headers-embed-routes
**Server:** http://localhost:3001 (Nuxt dev)

## Test Scope

PR #9 modifies only `netlify.toml` headers configuration:
- Embed routes (`/embed/*`): `Content-Security-Policy: frame-ancestors *` (allows iframe embedding)
- Catch-all routes (`/*`): `X-Frame-Options: DENY` + `frame-ancestors 'none'` (blocks iframe embedding)
- Both route groups receive shared security headers (XSS protection, content-type options, referrer policy, permissions policy)

**Note:** Netlify headers are applied at the CDN level and cannot be tested locally. Browser tests confirm no rendering regressions from the `netlify.toml` changes.

## Pages Tested: 2

| Route | Status | Notes |
|-------|--------|-------|
| `/` (main page) | PASS | Renders correctly — title, globe, chart, all country labels visible |
| `/embed/renewables` (embed page) | PASS | Renders correctly — identical infographic content displayed properly |

## Console Errors: 0

No console errors detected on either page.

## Failures: 0

No failures found.

## Screenshots

- `browser-test-main-page.png` — Full-page capture of `/`
- `browser-test-embed-renewables.png` — Full-page capture of `/embed/renewables`

## Result: PASS (2/2)
