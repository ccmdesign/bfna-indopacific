---
status: resolved
priority: p2
issue_id: "040"
tags: [code-review, performance, quality]
dependencies: []
---

# Double useEmbedCode Composable Invocation Per Embed

## Problem Statement

Each embed on the test page triggers `useEmbedCode` twice: once in `<script setup>` (line 31-34) to get `embedCode`, and once inside `<EmbedCodeButton>` (which internally calls `useEmbedCode` with the same slug/title). This creates duplicate reactive state (computed refs, clipboard checks, timers, `onScopeDispose` handlers) for each embed entry.

**Why it matters:** While not a bug with only 2 embeds, this doubles the reactive overhead per embed and creates two independent clipboard/timer lifecycles for the same slug. If the embed list grows, this becomes a real concern.

## Findings

- `pages/test/embeds.vue` line 31-34: calls `useEmbedCode(() => e.slug, () => e.title)` for each embed
- `components/EmbedCodeButton.vue` line 7-10: calls `useEmbedCode(() => props.slug, () => props.title)` again
- Each invocation creates: 2 computed refs, 3 plain refs, 1 `onScopeDispose` handler, clipboard availability check
- With 2 embeds this means 4 composable instances instead of 2

## Proposed Solutions

### Option A: Display embedCode from the composable directly in the page, drop EmbedCodeButton's internal call (Recommended)
Refactor the test page to expose the full composable return (including `copyEmbedCode`) and pass the copy function to a simpler button, or render the code block from the composable's output and only use `EmbedCodeButton` for the copy action (accepting the duplication as the cost of reusing the existing component).

- **Pros:** Clean separation; one source of truth per embed
- **Cons:** Requires either a new lightweight button or modifying EmbedCodeButton to accept embed code as a prop
- **Effort:** Medium
- **Risk:** Low

### Option B: Accept the duplication (Pragmatic)
Document the known duplication with a code comment and accept it. The test page is dev-only with 2 items, so the overhead is negligible in practice.

- **Pros:** No code changes needed; keeps existing component reuse simple
- **Cons:** Sets a bad precedent; confusing for future maintainers
- **Effort:** None
- **Risk:** None

### Option C: Remove the script-level useEmbedCode call; show raw code via the iframe src directly
Instead of calling `useEmbedCode` in script setup, just display the embed code string inline in the template using string interpolation (since the format is known). Keep `EmbedCodeButton` for copy functionality.

- **Pros:** Eliminates one composable call per embed entirely
- **Cons:** The displayed code would diverge from `useEmbedCode` output if the composable changes
- **Effort:** Small
- **Risk:** Medium (code drift)

## Recommended Action

Option B for now -- the duplication is acceptable for a 2-item dev tool. Add a brief code comment noting the duplication.

## Technical Details

**Affected files:**
- `pages/test/embeds.vue` (lines 31-34)
- `components/EmbedCodeButton.vue` (lines 7-10)

## Acceptance Criteria

- [ ] Code comment documents the known double-invocation
- [ ] OR refactored to single invocation per embed

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-05 | Created during code review of PR #15 | EmbedCodeButton internally calls useEmbedCode again |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/15
- Composable: `composables/useEmbedCode.ts`
- Button component: `components/EmbedCodeButton.vue`
