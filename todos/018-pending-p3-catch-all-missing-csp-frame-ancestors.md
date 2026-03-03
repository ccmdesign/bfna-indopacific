---
status: resolved
priority: p3
issue_id: "018"
tags: [code-review, security, headers, csp, netlify]
dependencies: []
---

# Missing CSP frame-ancestors on Catch-All Route

## Problem Statement

The `/*` catch-all header block in `netlify.toml` relies solely on `X-Frame-Options: DENY` for clickjacking protection but does not include a `Content-Security-Policy: frame-ancestors 'none'` directive. While `X-Frame-Options: DENY` is effective in all browsers (including legacy), modern CSP best practice is to send both headers with equivalent policies for defense-in-depth. The embed routes already use CSP `frame-ancestors`, creating an inconsistency.

**Why it matters:** If a future change accidentally removes `X-Frame-Options` from the catch-all block, there would be no fallback framing protection. Adding `frame-ancestors 'none'` provides a redundant layer. Additionally, some security scanners specifically check for CSP presence on all routes.

## Findings

- **File:** `netlify.toml`, lines 21-27
- **Evidence:** The `/*` block has `X-Frame-Options = "DENY"` but no `Content-Security-Policy` directive. OWASP recommends sending both `X-Frame-Options` and `frame-ancestors` with equivalent policies.
- **Source agent:** security-sentinel
- **Severity:** P3 (nice-to-have) because `X-Frame-Options: DENY` alone is sufficient for clickjacking protection in all current browsers.

## Proposed Solutions

### Option A: Add CSP frame-ancestors to catch-all
**Pros:** Defense-in-depth, consistent CSP usage across both route blocks, satisfies security scanner checks.
**Cons:** Marginally more header bytes per response.
**Effort:** Small
**Risk:** Low

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    Content-Security-Policy = "frame-ancestors 'none'"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

### Option B: Leave as-is
**Pros:** `X-Frame-Options: DENY` is already effective. Keeps config minimal.
**Cons:** Misses defense-in-depth opportunity.
**Effort:** N/A
**Risk:** Very low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `netlify.toml`
- **Affected components:** HTTP response headers for non-embed routes
- **Database changes:** None

## Acceptance Criteria

- [ ] `/*` routes include `Content-Security-Policy: frame-ancestors 'none'` header
- [ ] `X-Frame-Options: DENY` remains in place alongside the CSP directive
- [ ] Verified via `curl -sI` on deploy preview

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Identified during PR #9 code review | CSP and X-Frame-Options should be used together per OWASP |
| 2026-03-03 | Resolved (Option A): added `Content-Security-Policy = "frame-ancestors 'none'"` to `/*` catch-all block in `netlify.toml` | Defense-in-depth alongside X-Frame-Options: DENY |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/9
- [OWASP Clickjacking Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)
- [MDN: CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)
