---
severity: P3
autofix_class: advisory
owner: human
requires_verification: false
pre_existing: true
file: data/asean/placeholder-data.ts
line: 72
reviewer: maintainability
created: 2026-05-07
run_id: 20260507-144034-2cd8cc5c
---

# Caption text inconsistency between inScope and stretch profiles

## Issue

The 4 new stretch profiles use the expanded caption form:
"Placeholder caption. The narrative for each country will be commissioned alongside the May 2026 data drop."

4 of 5 inScope profiles (Thailand, Singapore, Malaysia, Vietnam) use the short form:
"Placeholder caption."

Indonesia (inScope) uses the expanded form matching the stretch profiles.

This is a pre-existing inconsistency in the inScope data, not introduced by this PR.
The stretch profiles chose the more informative pattern, which is reasonable.

## Suggested Action

When real captions are commissioned in May 2026, this inconsistency will be resolved
naturally. No action needed before then unless the team wants consistent placeholder text.
If so, update the 4 short-form inScope captions to match the expanded pattern.
