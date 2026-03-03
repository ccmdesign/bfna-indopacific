---
status: wont_fix
priority: p2
issue_id: "019"
tags: [code-review, security, headers, netlify, verification]
dependencies: []
---

# Deploy Preview Header Merge Verification Required

## Problem Statement

The PR correctly identifies a critical ambiguity in Netlify's header rule merging behavior: it is undocumented whether multiple matching `[[headers]]` blocks merge their headers or whether only the first matching block applies. If Netlify merges headers from ALL matching rules, `X-Frame-Options: DENY` from the `/*` block will leak onto `/embed/*` routes, defeating the purpose of this change entirely.

The PR's plan document thoroughly describes this risk and provides fallback strategies (Edge Functions, `ALLOWALL` override), but the acceptance criteria show this verification has not yet been completed (the iframe cross-origin test checkboxes are unchecked). This verification MUST happen on the deploy preview before merge.

**Why it matters:** If headers merge, the entire feature (cross-origin iframe embedding) will silently fail. Modern browsers will ignore the leaked `X-Frame-Options` when `frame-ancestors` is present, but older browsers may block framing. More critically, having contradictory headers (`frame-ancestors *` + `X-Frame-Options: DENY`) signals a misconfiguration that could confuse future maintainers.

## Findings

- **File:** `docs/plans/2026-03-03-feat-update-netlify-headers-embed-routes-plan.md`, Acceptance Criteria section
- **Evidence:** Two acceptance criteria are unchecked: "An iframe on a different domain can successfully load /embed/renewables" and "An iframe on a different domain is blocked from loading / or any non-embed route". Three additional deploy-preview-dependent criteria are also unchecked.
- **Source agent:** architecture-strategist, security-sentinel
- **Note:** This is not a code defect but a mandatory verification step that blocks confident merge.

## Proposed Solutions

### Option A: Verify on deploy preview before merge
**Pros:** Confirms the feature works as intended, validates the first-match-wins assumption.
**Cons:** Requires waiting for Netlify deploy preview.
**Effort:** Small
**Risk:** None

```bash
# After deploy preview is available:
curl -sI https://<preview-url>/embed/renewables | grep -ci 'x-frame-options'
# Expected: 0

curl -sI https://<preview-url>/embed/renewables | grep -i 'content-security-policy'
# Expected: Content-Security-Policy: frame-ancestors *

curl -sI https://<preview-url>/ | grep -i 'x-frame-options'
# Expected: X-Frame-Options: DENY
```

### Option B: Merge and verify on staging
**Pros:** Faster iteration.
**Cons:** If headers merge incorrectly, the fix requires another PR/deploy cycle.
**Effort:** N/A
**Risk:** Medium -- silent feature failure

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `netlify.toml`
- **Affected components:** Netlify CDN header serving behavior
- **Database changes:** None

## Acceptance Criteria

- [ ] `curl -sI <preview>/embed/renewables` returns 0 matches for `x-frame-options`
- [ ] `curl -sI <preview>/embed/renewables` returns `Content-Security-Policy: frame-ancestors *`
- [ ] `curl -sI <preview>/` returns `X-Frame-Options: DENY`
- [ ] Cross-origin iframe test loads `/embed/renewables` successfully
- [ ] Cross-origin iframe test blocks `/` (non-embed route)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Identified during PR #9 code review | Netlify header merging behavior is undocumented; deploy preview is the only reliable verification |
| 2026-03-03 | Marked wont_fix: this is a manual verification task requiring a live Netlify deploy preview URL, not a code change. Must be performed post-deploy by running curl commands against the preview URL. | Cannot be automated without a deployed environment |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/9
- [Netlify: Remove inherited header applied by splat path](https://answers.netlify.com/t/remove-inherited-header-applied-by-splat-path-in-headers/26263)
- [Netlify Custom Headers Docs](https://docs.netlify.com/manage/routing/headers/)
