---
description: Full autonomous engineering workflow
---
Run these slash commands in order. Do not do anything else. Do not stop between steps — complete every step through to the end.

1. **Optional:** If the `ralph-wiggum` skill is available, run `/ralph-wiggum:ralph-loop "finish all slash commands" --completion-promise "DONE"`. If not available or it fails, skip and continue to step 2 immediately.
2. Find the associated Linear issue using `mcp_linear_linear_search_issues` and update its status to `In Progress`.
3. `/workflows:plan $ARGUMENTS`
4. `/compound-engineering:deepen-plan`
5. `/workflows:work`
6. `/workflows:review`
7. Transition the Linear issue status to `In Review` and add a comment with the PR link.
8. `/compound-engineering:resolve_todo_parallel`
9. `/compound-engineering:test-browser`
10. `/compound-engineering:feature-video`
11. Output `<promise>DONE</promise>` when video is in PR. Mark the Linear issue as `Done`.

Start with step 2 now (or step 1 if ralph-wiggum is available).

User request: {{args}}
