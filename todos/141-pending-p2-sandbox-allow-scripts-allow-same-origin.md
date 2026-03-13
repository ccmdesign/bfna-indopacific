---
status: resolved
priority: p2
issue_id: "BF-111"
tags: [code-review, security, iframe]
dependencies: []
---

# iframe sandbox="allow-scripts allow-same-origin" negates sandbox protection

## Problem Statement

The `MarineTrafficEmbed.vue` component uses `sandbox="allow-scripts allow-same-origin"` on the iframe. Per MDN and OWASP guidance, combining `allow-scripts` and `allow-same-origin` together effectively removes the sandbox's security protections because the embedded content can then remove the sandbox attribute itself via JavaScript. While MarineTraffic is a trusted third party, this is a security anti-pattern.

## Findings

- `components/straits/MarineTrafficEmbed.vue:58` sets `sandbox="allow-scripts allow-same-origin"`
- The embed HTML files are same-origin (served from `/embeds/*`), so `allow-same-origin` is required for MarineTraffic's `embed.js` to function (it makes cross-origin requests to tile servers).
- Since the embed files are same-origin AND scripts are allowed, the sandbox provides no meaningful protection.

## Proposed Solutions

### Option 1: Remove sandbox entirely, rely on CSP

**Approach:** Remove the `sandbox` attribute and rely on the CSP headers in `netlify.toml` for security. The embed HTML files already have their own CSP meta tags.

**Pros:**
- Honest about the security model (CSP, not sandbox)
- No false sense of security

**Cons:**
- Loses the "defense in depth" appearance

**Effort:** 5 minutes

**Risk:** Low

### Option 2: Keep sandbox, document the trade-off

**Approach:** Add a code comment explaining why both values are needed and that CSP is the primary security mechanism.

**Pros:**
- No behavior change
- Documents the decision

**Cons:**
- Still a misleading security signal

**Effort:** 5 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `components/straits/MarineTrafficEmbed.vue:58`

## Resources

- **PR:** #35
- [MDN: iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox)
- [OWASP: sandbox allow-scripts + allow-same-origin](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)

## Acceptance Criteria

- [ ] Sandbox either removed or documented with rationale
- [ ] MarineTraffic embeds still load correctly

## Work Log

### 2026-03-12 - Code Review Discovery

**By:** Claude Code (ce-review)
