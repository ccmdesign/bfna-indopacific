# Base Engineering Instructions

## Branching Strategy

- Our default branch is `dev`.
- All feature branch checkouts, pull requests, and git diffs must be performed against `dev`.
- Do not use `main` as the baseline. Always merge and push to `dev`.

## Plane Task Tracking

For every task performed via the compound engineering workflow, the agent MUST update the associated issue in **Plane** (workspace `ccm-design`). Use the Plane MCP (`mcp__plane__*`) when connected, otherwise the free `plane-api` skill (REST):

- **Before Planning/Work:** Move status to `In Progress`.
- **When creating a PR (Review phase):** Move status to `In Review`.
- **Upon Merge/Completion:** Move status to `Done`.
- **Reporting Progress:** Add a comment summarizing the PR or completed work with a link (run the body through the `plane-markdown` skill).
