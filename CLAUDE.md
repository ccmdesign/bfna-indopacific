# Base Engineering Instructions

## Branching Strategy

- Our default branch is `dev`.
- All feature branch checkouts, pull requests, and git diffs must be performed against `dev`.
- Do not use `main` as the baseline. Always merge and push to `dev`.

## Linear Task Tracking

For every task performed via the compound engineering workflow, the agent MUST update the associated issue in Linear using the `mcp_linear_*` tools:

- **Before Planning/Work:** Update status to `In Progress`.
- **When creating a PR (Review phase):** Update status to `In Review`.
- **Upon Merge/Completion:** Update status to `Done`.
- **Reporting Progress:** Add a comment (`mcp_linear_linear_add_comment`) summarizing the PR or completed work with a link.
