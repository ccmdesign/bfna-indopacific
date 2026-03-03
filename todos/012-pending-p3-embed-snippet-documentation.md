---
status: resolved
priority: p3
issue_id: "012"
tags: [code-review, documentation, security, BF-70]
dependencies: []
---

# No Embed Snippet or `sandbox` Attribute Guidance for Third-Party Sites

## Problem Statement

The PR adds server-side headers (`frame-ancestors *`) to allow third-party iframe embedding, but provides no documentation or example embed snippet showing how embedding sites should configure their `<iframe>` tags. Specifically, there is no guidance on which `sandbox` attributes to use, what dimensions to set, or how to handle responsive embedding.

**Why it matters:** The infographics are designed for a specific viewport (1280x800 recommended). Without an example snippet, embedding partners may use incorrect dimensions (causing clipping due to the `overflow: hidden` on `.master-grid`), omit `sandbox` attributes (allowing the embedded content unnecessary privileges), or encounter unexpected behavior. A simple embed code example reduces integration friction and improves security posture.

## Findings

- **Location:** No embed documentation exists in the repository
- **Evidence:** The plan document (Part 3, Part 4) describes how embed pages will use `definePageMeta({ layout: 'embed' })` and how headers enable iframe embedding, but does not include an example `<iframe>` snippet for embedding partners.
- **Agent:** agent-native-reviewer, architecture-strategist
- **Impact:** Low immediate impact (no embed pages exist yet), but will become relevant when embed pages are shared with external partners.

## Proposed Solutions

### Option 1: Add an example embed snippet to the plan or a future embed documentation page
- **Pros:** Provides clear integration guidance; documents recommended `sandbox` attributes
- **Cons:** May be premature since no embed pages exist yet
- **Effort:** Small
- **Risk:** None
- **Example snippet:**
  ```html
  <iframe
    src="https://indopacific.bfranklinscience.org/embed/renewables"
    width="1280"
    height="800"
    sandbox="allow-scripts allow-same-origin"
    loading="lazy"
    title="Indo-Pacific Renewable Energy Infographic"
  ></iframe>
  ```

### Option 2: Defer until embed pages are created (separate task)
- **Pros:** YAGNI -- no embed pages exist yet; avoids documenting something that does not exist
- **Cons:** May be forgotten; embedding partners will need guidance eventually
- **Effort:** None now
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** None currently (new documentation would be created)
- **Components:** Embed integration documentation
- **Database changes:** None

## Acceptance Criteria

- [ ] An example `<iframe>` embed snippet with recommended `sandbox`, `width`, `height`, `loading`, and `title` attributes exists (in plan, README, or dedicated doc)
- [ ] The snippet is tested against a deployed embed page

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #7 code review | No embed documentation exists; `overflow: hidden` + `min-height: 1080px` makes dimensions critical for embedding partners |
| 2026-03-03 | Resolved (Option 1): added "Embedding Infographics" section to `README.md` with example `<iframe>` snippet, `sandbox` attribute guidance, dimension notes, and header documentation | Added to README rather than a separate file to keep docs discoverable |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/7
- Plan: `docs/plans/2026-03-03-feat-create-embed-layout-plan.md`, Parts 3-4
- MDN sandbox attribute: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox
- Plan viewport concern: `docs/plans/2026-03-03-feat-create-embed-layout-plan.md`, "Embed viewport considerations"
