---
status: pending
priority: p2
issue_id: "BF-101"
tags: [code-review, performance, architecture]
dependencies: []
---

# useShipSimulation instantiated for every StraitCircle wastes event listeners

## Problem Statement

Every `StraitCircle` instance (6 total, one per strait) creates its own `useShipSimulation` composable on mount. Even though the simulation only starts when `corridorId` is non-null (i.e., the strait is selected), the `onMounted` hook in `useShipSimulation` unconditionally registers three global event listeners per instance: `resize`, `visibilitychange`, and `matchMedia('prefers-reduced-motion')`.

This means 18 event listeners are registered for the 5 non-selected straits that will never run a simulation. When a different strait is selected, the old listeners remain active (component stays mounted), accumulating overhead.

## Findings

- `useShipSimulation.ts:484-525` — `onMounted` registers `resize`, `visibilitychange`, and `matchMedia.change` listeners unconditionally
- `StraitCircle.vue:26` — `useShipSimulation` is called at component setup time for every instance
- 6 StraitCircle instances are rendered (one per strait in `straits.json`)
- Only 1 strait can be selected at a time, so 5 instances always have idle simulations with active listeners
- The listeners themselves are lightweight, but this is an architectural concern: the composable was designed for single-instance use

## Proposed Solutions

### Option 1: Guard listener registration behind geometry availability

**Approach:** In `useShipSimulation`, defer event listener registration until `geometry` becomes non-null for the first time. Only register when the simulation actually needs to run.

**Pros:**
- Minimal change to existing code
- Zero listeners for non-selected straits

**Cons:**
- Slightly more complex lifecycle logic

**Effort:** 1 hour

**Risk:** Low

---

### Option 2: Move useShipSimulation out of StraitCircle into StraitMap

**Approach:** Lift the composable invocation to `StraitMap.vue` (which already computes `selectedTrafficConfig`). Pass `ships` array down through props instead of calling the composable in each circle.

**Pros:**
- Single composable instance regardless of strait count
- Cleaner data flow (simulation lives where the selection logic lives)

**Cons:**
- Requires threading `ships` through StraitData -> StraitCircle props
- Breaks encapsulation of ship rendering within StraitCircle

**Effort:** 2-3 hours

**Risk:** Low

## Recommended Action

*To be filled during triage.*

## Technical Details

**Affected files:**
- `composables/useShipSimulation.ts:484-525` — onMounted listener registration
- `components/straits/StraitCircle.vue:26` — composable instantiation

**Related components:**
- `StraitMap.vue` — parent that manages selection
- `StraitData.vue` — intermediary prop-passing component

## Resources

- **PR:** #25
- **Related:** BF-100 (useShipSimulation composable)

## Acceptance Criteria

- [ ] Non-selected StraitCircle instances do not register global event listeners
- [ ] Ship simulation still works correctly when a strait is selected
- [ ] Listener cleanup still works on component unmount

## Work Log

### 2026-03-08 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified 18 unnecessary event listeners from 6 StraitCircle instances
- Traced listener registration to unconditional onMounted in useShipSimulation
- Proposed two solutions with different trade-offs
