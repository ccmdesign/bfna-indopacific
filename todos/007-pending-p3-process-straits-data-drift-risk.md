---
status: pending
priority: p3
issue_id: "BF-73"
tags: [code-review, architecture, data]
dependencies: []
---

# _process/straits.json and data/straits/straits.json drift risk

## Problem Statement

After the dataset consolidation, `_process/straits.json` and `data/straits/straits.json` are byte-identical duplicates with no mechanism to keep them in sync. The `_process/` directory is a data preparation workspace, while `data/straits/` is the canonical runtime location. If a future data update modifies one but not the other, the files will silently diverge, creating confusion about which is the source of truth.

## Findings

- `diff _process/straits.json data/straits/straits.json` shows zero differences (verified 2026-03-03)
- `_process/` directory contains data preparation artifacts (`data-methodology-for-client.md`, `email-to-client.md`)
- No documentation in `_process/` indicates the relationship between the two copies
- The PR plan document acknowledges this risk under "New Risks Discovered" as low risk

## Proposed Solutions

### Option 1: Add a note to _process/data-methodology-for-client.md

**Approach:** Append a brief note to the existing methodology document indicating the canonical location is `data/straits/straits.json`.

**Pros:**
- Zero-cost, minimal change
- Documents the relationship for future contributors
- Does not change any runtime behavior

**Cons:**
- Relies on human discipline to follow the convention
- Does not prevent drift, only documents the risk

**Effort:** 10 minutes

**Risk:** Low

---

### Option 2: Replace _process/straits.json with a symlink

**Approach:** Delete `_process/straits.json` and create a symlink to `data/straits/straits.json`.

**Pros:**
- Eliminates drift entirely -- single source of truth
- Any tool reading `_process/straits.json` gets the canonical data

**Cons:**
- Symlinks can be problematic on Windows
- May confuse data preparation tools that expect a regular file

**Effort:** 15 minutes

**Risk:** Low-Medium

---

### Option 3: Remove _process/straits.json entirely

**Approach:** Delete `_process/straits.json` since the canonical copy now lives in `data/straits/`.

**Pros:**
- Eliminates the duplication entirely
- Simplest long-term solution

**Cons:**
- Breaks any existing workflow that references `_process/straits.json`
- Needs verification that no scripts or documentation link to it

**Effort:** 15 minutes

**Risk:** Low

## Recommended Action

*To be filled during triage.*

## Technical Details

**Affected files:**
- `_process/straits.json` - duplicate of canonical data
- `data/straits/straits.json` - canonical runtime location
- `_process/data-methodology-for-client.md` - potential place to document relationship

## Resources

- **PR:** #5
- **Plan reference:** `docs/plans/2026-03-03-refactor-consolidate-datasets-into-data-folder-plan.md` (Section: "Step 2 Research Insights -- `_process/` Directory Drift Risk")

## Acceptance Criteria

- [ ] The relationship between `_process/` and `data/` is documented or the duplication is resolved
- [ ] Future contributors can determine which file is the source of truth

## Work Log

### 2026-03-03 - Code Review Discovery

**By:** Claude Code (PR #5 review)

**Actions:**
- Verified byte-identical duplication via `diff` command
- Reviewed `_process/` directory contents for context
- Identified three resolution approaches

**Learnings:**
- The `_process/` directory serves as a data preparation workspace, not a runtime dependency
- The PR plan already identified this risk but deferred resolution
