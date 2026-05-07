---
severity: P2
autofix_class: manual
owner: human
requires_verification: true
pre_existing: false
file: components/asean/AseanMap.vue
line: 209
reviewer: maintainability, correctness
created: 2026-05-07
run_id: 20260507-144034-2cd8cc5c
---

# Brunei label dy offset needs visual verification at embed widths

## Issue

The Brunei `<text>` label uses `dy="-12"` to offset it above the tiny country polygon
(line 209 of `AseanMap.vue`). The centroid-distance analysis confirms no overlap with
Singapore (178px apart) or Malaysia (80px apart) at the default 1280x720 viewBox.

However, the plan explicitly calls out that "the exact value should be tuned visually"
and that label overlap should be verified at "common embed widths" beyond the default
viewBox. The `preserveAspectRatio="xMidYMid slice"` on the SVG means different container
aspect ratios will clip differently, potentially bringing labels closer together.

## Suggested Action

Open the ASEAN infographic in the browser at the default viewBox (1280x720) and at
common embed widths (800px, 1024px, 1440px) to visually confirm:

1. Brunei label does not overlap with Malaysia's coastline or label
2. Brunei label does not collide with Singapore's label
3. The `-12` offset looks natural (label sits above the polygon without floating too high)

Adjust the `dy` value if overlap appears at any tested width.
