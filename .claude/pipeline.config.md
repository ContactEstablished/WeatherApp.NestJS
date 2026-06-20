# Phase Pipeline — Repo Config

**Fill this in once per repo.** Every pipeline agent reads this file first to learn this repo's
paths, conventions, commands, and commit policy. Nothing else in the kit is repo-specific — keep your
edits here, not in the agent files, so the kit stays drop-in updatable.

In the path patterns below, `{phase}` and `{n}` are substituted by the agents (e.g. phase `17`,
task `3`). Use whatever layout your repo already uses — the example column shows the Bryk layout the
kit was distilled from; change the values to match your repo.

---

## Project
- **project_name:** `MyApp`
- **persona:** `You are the lead engineer for the MyApp project. You design, implement, and validate the work directly.`
  - One line the kickoff prompt opens with. Match your repo's role language if it has one.

## Artifact paths
| key | value (edit) | example (Bryk) |
|---|---|---|
| **roadmap** | `ROADMAP.md` | `ROADMAP.md` |
| **tasks_doc** | `docs/tasks/Tasks-{phase}-{n}.md` | `md/Tasks-{phase}-{n}.md` |
| **impl_doc** | `docs/tasks/Impl-{phase}-{n}.md` | `md/Impl-{phase}-{n}.md` |
| **prompt_doc** | `docs/prompts/Phase-{phase}-Prompt.md` | `md/prompts/Phase-{phase}-Prompt.md` |
| **handoff_dir** | `docs/handoffs/` | `md/handoffs/` |
| **decisions_dir** | `docs/decisions/` _(leave blank if you keep no ADRs)_ | `md/decisions/` |

## Conventions source
Files the agents read to learn this repo's coding rules, so generated specs match house style.
- **conventions:** `CLAUDE.md, AGENTS.md, CONTRIBUTING.md`
  - List whatever exists. If none exist yet, leave blank — the agents will infer conventions by
    reading representative source files, but a guidance doc gives much better results.

## Build / verify commands
Used in generated success criteria and the kickoff prompt's session checklist.
- **build_command:** `<e.g. dotnet build / npm run build / cargo build / make>`
- **test_command:** `<e.g. dotnet test / npm test / pytest / go test ./...>`
- **extra_checks:** `<optional, e.g. lint/typecheck command; leave blank if none>`

## Commit policy
- **commit_style:** `conventional`  _(feat: / fix: / refactor: / docs: / chore:)_
- **ai_coauthor_trailer:** `false`  _(true → append a Co-Authored-By trailer; false → omit it.
  Omitting keeps a single author and avoids skewing GitHub contributor counts.)_

## Review gate
- **gate:** `tasks`
  - `tasks` (recommended): the pipeline stops after the Tasks docs so you review the contracts
    before specs/prompt are generated.
  - `none`: run the whole pipeline unattended (specs + prompt) without stopping.
  - `roadmap`: also treat the roadmap as a gate (run `roadmap-architect`, stop, then `/phase-kickoff`).
