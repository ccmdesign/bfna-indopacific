---
status: resolved
priority: p2
issue_id: "025"
tags: [code-review, architecture, vue-reactivity]
dependencies: []
---

# Composable Title Parameter Loses Reactivity

## Problem Statement

In `EmbedCodeButton.vue` (line 7), `props.title` is passed to `useEmbedCode()` as a plain string value rather than as a reactive getter or ref. Inside the composable, `title` is used in the `embedCode` computed property (line 25), but since it was received as a primitive, the computed will never re-evaluate if `embedTitle` page meta changes at runtime.

**Why it matters:** Currently the title is static per-page (set in `definePageMeta`), so this has no visible effect. However, this pattern violates Vue composable best practices: composable parameters that feed into `computed()` should be reactive (ref, getter, or `toRef`) so the composable works correctly if values change. This is a correctness and maintainability concern.

## Findings

- **Location:** `components/EmbedCodeButton.vue` line 7, `composables/useEmbedCode.ts` line 13
- **Evidence:** `useEmbedCode(props.slug, props.title)` passes destructured primitive values. The composable signature `useEmbedCode(slug: string, title = '...')` accepts plain strings, not refs or getters.
- **Agent:** architecture-reviewer, vue-patterns-reviewer
- **Impact:** Low now (values are static), but blocks future reuse with dynamic titles and misaligns with Vue 3 composable conventions.

## Proposed Solutions

### Option 1: Accept `MaybeRefOrGetter<string>` and use `toValue()` inside computed
- **Pros:** Follows Vue 3 composable conventions; works with both static and reactive inputs
- **Cons:** Slightly more verbose API
- **Effort:** Small
- **Risk:** None

```typescript
import { toValue, type MaybeRefOrGetter } from 'vue'

export function useEmbedCode(slug: MaybeRefOrGetter<string>, title: MaybeRefOrGetter<string> = 'BFNA Indo-Pacific infographic') {
  const embedUrl = computed(() => {
    const s = toValue(slug)
    if (import.meta.client) {
      return `${window.location.origin}/embed/${s}`
    }
    return `/embed/${s}`
  })

  const embedCode = computed(() =>
    `<iframe src="${embedUrl.value}" ... title="${toValue(title)}"></iframe>`
  )
  // ...
}
```

### Option 2: Accept only refs and use `toRef(props, 'title')` at the call site
- **Pros:** Explicit about reactivity
- **Cons:** More boilerplate at call site
- **Effort:** Small
- **Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected files:** `composables/useEmbedCode.ts`, `components/EmbedCodeButton.vue`
- **Components:** `useEmbedCode` composable, `EmbedCodeButton` component
- **Database changes:** None

## Acceptance Criteria

- [ ] The composable accepts reactive inputs (ref, getter, or MaybeRefOrGetter)
- [ ] The `embedCode` computed re-evaluates if slug or title changes
- [ ] Existing static usage continues to work without changes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created during PR #11 code review | Vue composable parameters feeding computed() should be reactive |
| 2026-03-03 | Resolved (Option 1): changed `useEmbedCode` to accept `MaybeRefOrGetter<string>` for both `slug` and `title`, using `toValue()` inside computed properties. Updated `EmbedCodeButton.vue` to pass getter functions `() => props.slug` and `() => props.title` | Follows Vue 3 composable conventions; computed re-evaluates reactively |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/11
- Vue docs on composable conventions: https://vuejs.org/guide/reusability/composables.html
