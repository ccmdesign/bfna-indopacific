---
status: pending
priority: p2
issue_id: "075"
tags: [code-review, quality, typescript, BF-78]
dependencies: []
---

# Unsafe `as any` Cast on Historical Data Access

## Problem Statement

In `useParticleSystem.ts` line 74, the historical data from `straits.json` is accessed via an `as any` cast:

```ts
const historical = (straitsData as any).historical as Record<string, Record<string, StraitHistoricalEntry>>
```

This bypasses TypeScript's type checking entirely. The `StraitsData` interface in `types/strait.ts` already declares `historical` with the correct type, but the JSON import is not typed through that interface.

## Findings

- **Source:** `composables/useParticleSystem.ts`, line 74
- **Evidence:** `(straitsData as any).historical` -- double cast through `any`
- **Root cause:** The JSON import (`import straitsData from '~/data/straits/straits.json'`) is inferred as a generic JSON type by TypeScript, not as `StraitsData`
- **Impact:** If the JSON schema drifts (field renamed, structure changed), no compile-time error will surface -- the code will silently get `undefined` and fall back to default particle counts

## Proposed Solutions

### Option A: Type-assert the import at the source
- **Approach:** `import straitsData from '~/data/straits/straits.json' assert { type: 'json' }` and add a module declaration, or cast `as StraitsData` at import
- **Pros:** Single point of truth, all consumers get typed access
- **Cons:** Requires a `.d.ts` module declaration or import assertion support
- **Effort:** Small
- **Risk:** Low

### Option B: Use a typed wrapper/loader
- **Approach:** Create `data/straits/index.ts` that imports the JSON and re-exports with a type assertion, validated at build time
- **Pros:** Centralized, testable
- **Cons:** One more file
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Option A

## Technical Details

- **Affected files:** `composables/useParticleSystem.ts`, `components/StraitMap.vue` (also uses `as Strait[]` cast)

## Acceptance Criteria

- [ ] No `as any` casts remain for straits data access
- [ ] TypeScript compiler catches schema mismatches at build time
- [ ] Existing runtime behavior unchanged

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from PR #21 code review | Double `as any` cast bypasses type safety |

## Resources

- PR: https://github.com/ccmdesign/bfna-indopacific/pull/21
- File: `composables/useParticleSystem.ts`, line 74
