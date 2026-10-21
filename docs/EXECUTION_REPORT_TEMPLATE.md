# Execution Report Template

> One copy per work item. Suggested path: `docs/reports/Pxx-yy.md`.

```markdown
# Task: Pxx-yy — <title>
Status: TODO | IN_PROGRESS | VERIFYING | DONE | FAILED | BLOCKED
Gate: Gx — NOT VERIFIED | PASS | FAIL

## Baseline
- Repository state / git status:
- Parent task / dependencies:
- Current defects / reproduction steps:

## Planned changes
- Files/modules:
- Interfaces/contracts changed:
- Data migration / rollback:
- Security and legal considerations:

## Implementation
- Files modified:
- Behavior implemented:
- Tests added/changed:

## Verification evidence
| Command | Exit code | Summary / log path | Status |
|---|---:|---|---|
| npm run typecheck | | | NOT RUN |
| npm run lint | | | NOT RUN |
| npm run test:unit | | | NOT RUN |
| npm run test:integration | | | NOT RUN |
| npm run test:e2e | | | NOT RUN |
| npm run build | | | NOT RUN |
| supabase test db (if applicable) | | | NOT RUN |

## Acceptance criteria
- AC-xxx: PASS / FAIL / NOT RUN — reason

## Risks and defects
- Unresolved issues:
- Root cause of failed tests:
- Fix and re-test plan:

## Final decision
- Task is DONE only if tests and acceptance passed.
- Gate is PASS only if every blocking task DONE and verification evidence exists.
- Next allowed task:
```
