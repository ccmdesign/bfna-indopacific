---
title: "feat: Update Netlify headers for embed routes"
type: feat
status: active
date: 2026-03-03
origin: docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md
deepened: 2026-03-03
---

# feat: Update Netlify headers for embed routes

## Enhancement Summary

**Deepened on:** 2026-03-03
**Sections enhanced:** 7
**Research sources used:** Netlify docs, OWASP Clickjacking Defense, MDN CSP/X-Frame-Options specs, Netlify community forums, BrowserStack frame-ancestors guide, StackHawk CSP scanner docs

### Key Improvements
1. Identified critical ambiguity in Netlify header rule merging behavior -- the plan's assumption that "first match wins" is only documented for redirects, not headers. Headers may merge from all matching rules, which would cause `X-Frame-Options: DENY` from `/*` to leak onto `/embed/*` routes. A mandatory deploy-preview verification step is added.
2. Added security risk analysis for `frame-ancestors *` (wildcard), documenting the intentional trade-off and adding a future consideration for domain-restricted embedding.
3. Expanded verification plan with a specific test for the header-merging edge case and a `netlify dev` limitation caveat.
4. Added new edge case: Netlify cannot unset/remove a header inherited from a broader rule -- only override it. If headers merge, the plan may need a different approach.
5. Added Permissions-Policy fullscreen consideration for embedded iframe interactivity.

### New Risks Discovered
- Netlify's header merging behavior for overlapping path rules (`/embed/*` and `/*`) is **not explicitly documented**. Community reports conflict: some say "first match wins" (like redirects), others report headers merging from all matching rules. This is the single highest-risk unknown in the plan.
- Netlify has **no mechanism to unset a header** for a specific path -- only to override it with a different value. If `X-Frame-Options: DENY` from `/*` merges onto `/embed/*`, there is no way to remove it in `netlify.toml` alone.
- Using `frame-ancestors *` exposes embed pages to potential clickjacking on the embed content itself (low risk for read-only infographics, but worth documenting).

---

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

### Research Insights

**Netlify Header Rule Merging -- Critical Ambiguity:**

The plan's inline comment states "Netlify processes first match," but this is only documented for **redirects**, not headers. The Netlify custom headers documentation does **not** explicitly specify whether multiple matching `[[headers]]` blocks merge their headers or whether only the first matching block applies. Community reports are conflicting:

- A Netlify support thread ([Remove inherited header applied by splat path](https://answers.netlify.com/t/remove-inherited-header-applied-by-splat-path-in-headers/26263)) has staff confirming "we'll parse the first matching rule" -- but also confirming that **Netlify cannot unset a header** inherited from a broader rule, only override it.
- The Gatsby plugin documentation states headers "will replace any matching headers" from more specific paths, suggesting a replacement model.
- The Netlify Introducing Structured Headers blog post does not clarify multi-rule merging.

**Impact on this plan:** If Netlify merges headers from ALL matching rules (both `/embed/*` and `/*`), then `X-Frame-Options: DENY` from the `/*` block would also apply to `/embed/*` routes, defeating the purpose of this change. The deploy-preview verification step (Step 1 under "Deploy preview verification") is therefore **mandatory, not optional** -- it is the only way to confirm the actual behavior.

**Fallback strategy if headers merge:** If `curl` on the deploy preview shows `X-Frame-Options: DENY` leaking onto `/embed/*`, the fallback is to **explicitly set `X-Frame-Options: ALLOWALL`** on the `/embed/*` block. While `ALLOWALL` is not a standard value, some CDN platforms interpret it as "allow all." Alternatively, Netlify Edge Functions could be used to strip the header programmatically.

**Best Practices (OWASP and MDN):**

- OWASP recommends `frame-ancestors 'none'` for pages that should not be embedded, and specific domain lists for pages that should. Using `frame-ancestors *` (wildcard) is the most permissive setting and intentionally trades clickjacking protection for universal embeddability. This is appropriate for read-only infographic content with no user input, forms, or authenticated state. ([OWASP Clickjacking Defense](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html))
- MDN confirms that `X-Frame-Options` is deprecated in favour of `frame-ancestors`. When both are present, modern browsers ignore `X-Frame-Options`. ([MDN: CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors))
- The 2025 industry best practice is to send both `frame-ancestors` and `X-Frame-Options` with equivalent policies for backward compatibility. This plan **intentionally deviates** from that pattern for embed routes because the goal is to allow cross-origin framing, which `X-Frame-Options` cannot express (the deprecated `ALLOW-FROM` directive only supported a single origin). ([CSP frame-ancestors vs X-Frame-Options](https://centralcsp.com/articles/frame-ancestor-frame-options))

**Security Scanner Consideration:**

Automated security scanners (e.g., StackHawk, Acunetix) will flag `frame-ancestors *` as a wildcard CSP vulnerability. This is a known, accepted trade-off for embeddable content. Consider adding a security exception/suppression note for the scanner so it does not generate recurring alerts. ([StackHawk CSP Scanner: Wildcard Directive](https://docs.stackhawk.com/vulnerabilities/10055/))

## Technical Considerations

### Header precedence: `frame-ancestors` vs `X-Frame-Options`

Modern browsers (Chrome 40+, Firefox 35+, Safari 10+, Edge 15+) follow the CSP Level 2 spec: when `frame-ancestors` is present, `X-Frame-Options` is ignored. By omitting `X-Frame-Options` from the embed rule entirely and relying solely on `frame-ancestors *`, we get:

- **Modern browsers:** `frame-ancestors *` allows framing from any origin. No conflict.
- **Older browsers (pre-CSP L2):** Without an `X-Frame-Options` header, the default browser behavior is to allow framing. This is the desired outcome for embeds.

If we kept `X-Frame-Options: SAMEORIGIN` alongside `frame-ancestors *`, older browsers would only allow same-origin framing, defeating the purpose.

#### Research Insights

**Browser Support Details:**

CSP Level 2 `frame-ancestors` has been supported in all major browsers since 2016:
- Chrome 40+ (January 2015)
- Firefox 35+ (January 2015)
- Safari 10+ (September 2016)
- Edge 15+ (April 2017)

As of 2026, the only browsers that do NOT support `frame-ancestors` are Internet Explorer (all versions) and very old Android Browser versions (pre-4.4). Global usage of these browsers is well below 1%. For the BFNA infographic use case (partner organisations embedding on modern websites), this is negligible.

**Edge Case -- IE11:** Internet Explorer 11 does not support `frame-ancestors` at all. Without `X-Frame-Options` on embed routes, IE11 will allow framing by default. This is the desired behavior. If IE11 support were a concern (it is not for this project), the only option would be client-side JavaScript frame-busting, which is unreliable.

### Netlify header rule ordering

Netlify processes `[[headers]]` blocks top-to-bottom and applies the **first matching** rule. The `/embed/*` block must remain above the `/*` catch-all. This is already the case in the current file and must be preserved. A comment in the file documents this requirement.

#### Research Insights

**Ordering Assumption Risk:**

The statement "Netlify processes [[headers]] blocks top-to-bottom and applies the first matching rule" is based on analogy with Netlify's documented redirect behavior, where the docs explicitly state "the redirects engine will process the first matching rule it finds, reading from top to bottom." However, the headers documentation does NOT contain equivalent language. The behavior may be:

1. **First match wins (redirect-like):** Only the `/embed/*` block's headers apply to embed routes. The `/*` block is ignored for those paths. This is the assumption of the plan and the desired behavior.
2. **All matches merge:** Both `/embed/*` and `/*` blocks' headers apply to embed routes, with conflicts resolved by... unclear precedence (first wins? last wins?).
3. **Most specific wins:** The `/embed/*` block takes priority because it is more specific than `/*`.

**Mitigation:** The deploy-preview `curl` verification (see Verification Plan) will definitively answer this question. If `X-Frame-Options: DENY` appears on `/embed/renewables`, the plan must be adjusted.

**Reserved Headers:**

Netlify cannot override certain reserved headers: `Accept-Ranges`, `Age`, `Allow`, `Connection`, `Content-Encoding`, `Content-Length`, `Content-Range`, `Date`, `Location`, `Server`, `Set-Cookie`, `Trailer`, `Transfer-Encoding`, `Upgrade`. Neither `X-Frame-Options` nor `Content-Security-Policy` are in this list, so both are safe to customize.

### No application code changes required

This change is entirely in `netlify.toml`. No Vue components, layouts, Nuxt config, or JavaScript need to change. The embed pages (`pages/embed/renewables.vue`) already use the `embed` layout and are pre-rendered via `nitro.prerender.routes` in `nuxt.config.ts`.

#### Research Insights

**Nuxt SSG and Headers:**

Since the site uses `npm run generate` (Nuxt SSG with `nitro.preset: 'static'`), all pages are pre-rendered as static HTML files. Netlify serves these static files from its CDN and applies `[[headers]]` rules to them. This is the ideal configuration for Netlify custom headers because:

- Headers apply only to files Netlify serves from its own backing store (static files qualify).
- There are no serverless functions, Edge Functions, or proxy rewrites that would bypass custom headers.
- The `netlify.toml` is copied to the publish directory (`.output/public`) during `npm run generate`.

**`netlify dev` Limitation:**

The local development server (`netlify dev` or `nuxi dev`) does NOT serve Netlify custom headers. This means local verification can only confirm the static build succeeds and the `netlify.toml` file content is correct. Actual header verification requires a Netlify deploy preview. This is already noted in the plan but is worth emphasizing as a verification constraint.

### Security posture

- Non-embed routes remain protected by `X-Frame-Options: DENY` (clickjacking prevention).
- Embed routes intentionally allow framing but retain all other security headers (`X-XSS-Protection`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- Embed pages already set `<meta name="robots" content="noindex, nofollow">` to prevent search engine indexing.

#### Research Insights

**Security Trade-off Analysis for `frame-ancestors *`:**

Using `frame-ancestors *` means ANY website can embed the infographic pages. This is an intentional design choice aligned with the brainstorm's "open to all domains" decision. The security implications are:

- **Clickjacking risk on embed pages:** Low. The embed pages render read-only infographic content with no user inputs, forms, buttons, or authenticated actions. Clickjacking attacks require a victim to interact with hidden UI elements, which does not apply to passive data visualisations.
- **Content attribution risk:** A malicious site could embed the infographic without attribution. This is mitigated by the infographic containing the BFNA branding within the component itself.
- **Phishing risk:** A malicious site could frame the infographic alongside fake content to create a misleading context. This is a low risk given the infographic's clearly branded, data-driven nature.

**Future Consideration -- Domain-Restricted Embedding:**

If the BFNA later wants to restrict embedding to approved partner domains only, the `frame-ancestors` directive supports specific domain lists:

```
Content-Security-Policy: frame-ancestors https://partner1.org https://partner2.org
```

This would require maintaining a list of approved domains in `netlify.toml`, which is a manual process. For now, `frame-ancestors *` is appropriate for the stated "open to all domains" requirement.

**Permissions-Policy -- `fullscreen` Directive:**

The current `Permissions-Policy` on embed routes sets `fullscreen=(self)`, which means only the embed page itself can request fullscreen. If the infographic uses any fullscreen interactions (e.g., expanding a chart), this should be tested. If the embedding site needs to allow fullscreen for the iframe, the `allow="fullscreen"` attribute must be set on the `<iframe>` element by the embedder, AND the `Permissions-Policy` must permit it. Consider whether `fullscreen=(self)` is too restrictive or whether the infographic ever uses the Fullscreen API.

**Additional Headers to Consider (Not Required, But Worth Noting):**

- `Cross-Origin-Embedder-Policy` (COEP) and `Cross-Origin-Opener-Policy` (COOP) -- these are NOT needed for this use case. Setting them could actually break iframe embedding. Do not add them.
- `Cross-Origin-Resource-Policy: cross-origin` -- could be added to embed routes to explicitly allow cross-origin resource loading, but this is not necessary since the default browser behavior already permits loading in cross-origin iframes when `frame-ancestors` allows it.

## Acceptance Criteria

- [ ] `/embed/*` routes do NOT send an `X-Frame-Options` response header
- [ ] `/embed/*` routes send `Content-Security-Policy: frame-ancestors *`
- [ ] `/embed/*` routes send `X-XSS-Protection`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` headers
- [ ] `/*` routes (non-embed) send `X-Frame-Options: DENY`
- [ ] `/*` routes send `X-XSS-Protection` and `X-Content-Type-Options` headers
- [ ] An iframe on a different domain can successfully load `/embed/renewables`
- [ ] An iframe on a different domain is blocked from loading `/` or any non-embed route
- [ ] The `/embed/*` header block appears BEFORE the `/*` catch-all in `netlify.toml`

### Research Insights -- Additional Acceptance Criteria to Consider

- [ ] **Header merging verification:** Confirm via `curl` that `X-Frame-Options: DENY` from the `/*` rule does NOT appear on `/embed/*` responses. This is the critical gatekeeper test.
- [ ] **CSP header is not duplicated:** Confirm that `/embed/*` routes send exactly ONE `Content-Security-Policy` header, not multiple (which could happen if headers merge from both rules).
- [ ] **Security scanner baseline:** If the team uses automated security scanning, note the expected `frame-ancestors *` finding and suppress it if needed.

## Verification Plan

### Local verification

1. Run `npm run generate` to confirm static build succeeds with no changes to application code.
2. Inspect the generated `netlify.toml` or the source file to confirm the header block matches the target above.

#### Research Insights

**Additional Local Checks:**

- Verify that `netlify.toml` is present in the publish directory (`.output/public/`) after `npm run generate`. Nuxt SSG copies this file automatically, but if the build configuration changes, this could break.
- Run `npx netlify build --dry` (if Netlify CLI is installed) to validate the `netlify.toml` syntax without deploying.
- Visually confirm the `/embed/*` block appears BEFORE the `/*` block by opening the file -- do not rely solely on automated checks.

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

#### Research Insights

**Enhanced Verification Steps:**

5. **Full header dump** on embed route (check ALL headers, not just framing-related ones):
   ```bash
   curl -sI https://<preview-url>/embed/renewables
   ```
   Verify the complete set: `Content-Security-Policy`, `X-XSS-Protection`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Confirm `X-Frame-Options` is absent.

6. **Header merging edge case** -- this is the most important verification step:
   ```bash
   curl -sI https://<preview-url>/embed/renewables | grep -ci 'x-frame-options'
   ```
   Expected: `0` (no matches). If the count is `1` or more, the `/*` rule's `X-Frame-Options: DENY` is leaking onto embed routes, and the plan's assumption about rule ordering is incorrect.

7. **Multiple browser test** -- test the cross-origin iframe in at least Chrome and Firefox to confirm consistent behavior. Safari is also recommended if available.

8. **Cross-origin iframe test using a local HTML file** -- the simplest way to test without setting up a separate origin:
   ```bash
   # Save this to a file, then open it via file:// protocol (different origin from the Netlify URL)
   echo '<iframe src="https://<preview-url>/embed/renewables" width="1280" height="800"></iframe>' > /tmp/test-embed.html
   open /tmp/test-embed.html
   ```
   Note: `file://` origin is a special case in some browsers. For a more reliable test, serve the HTML from `localhost` using Python's HTTP server:
   ```bash
   echo '<iframe src="https://<preview-url>/embed/renewables" width="1280" height="800"></iframe>' > /tmp/test-embed.html
   cd /tmp && python3 -m http.server 8888
   # Open http://localhost:8888/test-embed.html in browser
   ```

9. **Console error check** -- open browser DevTools on the negative test (step 4) and confirm the console shows a frame-blocked error such as `Refused to display 'https://...' in a frame because it set 'X-Frame-Options' to 'deny'`.

## File Changes

| File | Change |
|------|--------|
| `netlify.toml` | Remove `X-Frame-Options = "SAMEORIGIN"` from the `/embed/*` header block (line 16). No other changes. |

## Dependencies & Risks

- **Zero risk of breaking non-embed routes** -- the `/*` catch-all block is untouched.
- **Dependency:** Netlify deploy preview (or production deploy) required to fully verify headers, since `nuxi dev` does not serve Netlify headers.
- **Low risk:** Removing `X-Frame-Options` from embed routes is intentional. The `frame-ancestors *` CSP directive provides the modern equivalent protection model while allowing all-origin embedding.

### Research Insights -- Additional Risks

**Risk: Netlify header rule merging is undocumented (MEDIUM)**

As detailed in the "Netlify Header Rule Merging -- Critical Ambiguity" section above, the actual behavior when `/embed/*` and `/*` both match a request is not officially documented. If headers merge (rather than first-match-wins), `X-Frame-Options: DENY` from `/*` will leak onto embed routes. The deploy-preview curl test is the only reliable way to verify. If this risk materialises, the fallback approaches are:

1. Set `X-Frame-Options: ALLOWALL` on the `/embed/*` block (non-standard but recognized by some browsers/CDNs as "allow all").
2. Use a Netlify Edge Function to strip the `X-Frame-Options` header from `/embed/*` responses:
   ```javascript
   // netlify/edge-functions/strip-xfo.js
   export default async (request, context) => {
     const response = await context.next();
     response.headers.delete('X-Frame-Options');
     return response;
   };
   export const config = { path: "/embed/*" };
   ```
   Note: Edge Functions override custom headers from `netlify.toml`, so this would be a reliable fallback.
3. Move ALL header management to a single `/*` rule (losing per-path customization) and use Edge Functions for embed-specific header modifications.

**Risk: Netlify cannot unset a header (LOW-MEDIUM)**

A confirmed Netlify limitation: there is no mechanism to unset/remove a header for a specific path. You can only override it with a different value. If the first-match-wins assumption holds, this is irrelevant (the `/*` block never applies to `/embed/*`). But if headers merge, this limitation becomes blocking and requires the Edge Function fallback above.

**Risk: Security scanner false positives (LOW)**

Automated security scanners will flag `frame-ancestors *` as a wildcard CSP vulnerability. This is expected and should be documented in any security review or compliance audit. Add a suppression comment or exception in the scanner configuration.

**Risk: Future embed routes not pre-rendered (LOW)**

The current `nuxt.config.ts` pre-renders `/embed/renewables` explicitly. When new infographics are added (e.g., `/embed/straits`), they must also be added to `nitro.prerender.routes`. If a new embed route is not pre-rendered, Netlify will serve the SPA fallback (`/index.html` via the `/*` redirect), which may not have the correct headers. This is an operational risk for future development, not for this specific change.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md](../brainstorms/2026-03-03-multi-infographic-and-embeds-brainstorm.md) -- Key decisions carried forward: (1) embed routes open to all domains with no `X-Frame-Options` restriction, (2) path-specific header rules in `netlify.toml`, (3) `frame-ancestors *` as the CSP directive for embed routes.

### External References

- [MDN: X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options) -- documents deprecation in favour of `frame-ancestors`
- [MDN: CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors) -- modern standard for framing control
- [OWASP Clickjacking Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html) -- recommends using both headers for backward compatibility (we intentionally omit `X-Frame-Options` on embed routes to allow cross-origin framing)
- [Netlify Custom Headers Docs](https://docs.netlify.com/manage/routing/headers/) -- path matching and rule ordering
- [CSP frame-ancestors vs X-Frame-Options](https://centralcsp.com/articles/frame-ancestor-frame-options) -- precedence behaviour in modern vs older browsers

### References Added During Deepening

- [Netlify: Remove inherited header applied by splat path](https://answers.netlify.com/t/remove-inherited-header-applied-by-splat-path-in-headers/26263) -- Netlify staff confirms headers cannot be unset, only overridden; conflicting reports on merge vs first-match behavior
- [Netlify: Introducing Structured Redirects and Headers](https://www.netlify.com/blog/2017/10/17/introducing-structured-redirects-and-headers/) -- original announcement of `[[headers]]` TOML syntax
- [StackHawk: CSP Scanner Wildcard Directive](https://docs.stackhawk.com/vulnerabilities/10055/) -- documents security scanner behavior with `frame-ancestors *`
- [BrowserStack: frame-ancestors Guide](https://www.browserstack.com/guide/frame-ancestors) -- comprehensive browser support matrix and implementation guide
- [Invicti: Missing X-Frame-Options Header](https://www.invicti.com/blog/web-security/missing-x-frame-options-header) -- why CSP `frame-ancestors` is sufficient without `X-Frame-Options`
- [MDN: Clickjacking Prevention](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Clickjacking) -- practical implementation guide for clickjacking defenses
- [Netlify: Security-focused headers best practices](https://answers.netlify.com/t/security-focused-headers-for-netlify-sites-best-practices/27614) -- community-sourced header configuration patterns
