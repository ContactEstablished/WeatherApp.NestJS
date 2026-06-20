---
description: Kick off a phase — decompose the roadmap phase into Tasks docs, gate for review, then fan out Impl specs (parallel) and the execution prompt.
argument-hint: <phase-number>
---

Orchestrate the artifact pipeline for **Phase $1**. You are the main session; you invoke subagents via
the Agent tool and own the review gate. Do **not** write the artifacts yourself — delegate each step to
its role so it runs on the right model tier.

## Step 0 — Load config + preconditions (you do this inline; cheap)
1. Read `.claude/pipeline.config.md` for this repo's paths, conventions source, commands, commit
   policy, and the **gate** setting.
2. Confirm a clean working tree (`git status`) and read the **Phase $1** entry in the configured
   roadmap.
3. If the phase entry is missing or thin (no goal/scope/success-criteria, no enumerated task split),
   **STOP**: tell the user to run the `roadmap-architect` agent to author/normalize the Phase $1 entry
   first, and do nothing else.
4. Note the phase name, the task split (enumerated in the roadmap, or to be decided by the planner),
   and any "Decisions needed".

## Step 1 — Decompose into Tasks docs (phase-planner, Opus)
Invoke the **phase-planner** agent with phase number $1. It writes one Tasks doc per task at the
configured `tasks_doc` path. Wait for it to finish; note the task split it reports.

## Step 2 — GATE (skip only if config `gate: none`)
Read the Tasks docs the planner produced. Present the user a concise summary: one or two lines per task
(title + core acceptance contract + any approval-gated item or "Decisions needed" it locked). Then
**STOP and ask for explicit go/no-go.** Do not proceed until the user approves. If they request changes,
relay them to a fresh `phase-planner` invocation (or edit the specific Tasks doc for a small fix) and
re-present. *(If config `gate: none`, skip the stop and continue straight to Step 3.)*

## Step 3 — Fan out Impl build orders (spec-writer, Sonnet) — PARALLEL
Once approved (or immediately, if `gate: none`), invoke **one `spec-writer` agent per Tasks doc, all in
a single message** so they run concurrently. Give each the exact path to its one Tasks doc. Each writes
the matching Impl doc at the configured `impl_doc` path. Collect their one-line confirmations.

## Step 4 — Execution prompt (prompt-builder, Haiku)
Invoke the **prompt-builder** agent with phase $1. It assembles the phase prompt doc at the configured
`prompt_doc` path from the roadmap entry + the Tasks set. Wait for it.

## Step 5 — Report
Summarize for the user: the Tasks docs, Impl docs, and the prompt file produced (as clickable paths),
plus any approval gates flagged across the phase. Remind them that **implementation itself stays
interactive** in the main session (design walkthroughs + the repo's approval gates apply) — the
pipeline only produced the scaffolding. Do not start implementing unless the user asks.

## Notes
- The roadmap is the contract; never invent a task split that contradicts a roadmap enumeration.
- If any subagent reports a blocker (missing ADR, a task that needs a schema change/dependency),
  surface it at the next gate rather than papering over it.
