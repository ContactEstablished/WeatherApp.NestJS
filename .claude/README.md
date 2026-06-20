# Claude Code — Phase Pipeline Kit

A portable, repeatable subagent pipeline for taking a project **from a roadmap to ready-to-implement
specs**, one phase at a time. Drop it into any repo, fill in one config file, and run
`/phase-kickoff <n>`.

It encodes a five-role assembly line, each role on the cheapest model that does the job well:

| Role | Model | Produces | Runs |
|---|---|---|---|
| `roadmap-architect` | Opus | the roadmap (authoritative plan) | rarely; human-reviewed |
| `phase-planner` | Opus | one **Tasks** doc per task (acceptance contracts) | once per phase |
| `spec-writer` | Sonnet | one **Impl** doc per task (build orders) | **parallel**, one per task |
| `prompt-builder` | Haiku | the phase **execution prompt** | once per phase |
| `commit-writer` | Haiku | a proposed commit message (never commits) | after each task |

**Why it saves time and tokens:** the bulky step (per-task specs) fans out in parallel; each agent
gets an isolated, narrow context (its one task + the files it cites) instead of your whole session; and
templated steps run on Haiku instead of paying Opus rates. **Why quality holds:** there's one human
gate — you approve the Tasks contracts — and everything downstream derives from what you approved.

---

## Install (per repo)

1. Copy the `.claude/` folder from this kit into the **root of your target repo**. If the repo already
   has a `.claude/` folder, merge: drop the files into `.claude/agents/` and `.claude/commands/` and add
   `.claude/pipeline.config.md` alongside them.
2. Open **`.claude/pipeline.config.md`** and fill it in — this is the only file you edit. It sets your
   roadmap path, where Tasks/Impl/prompt docs go, your conventions doc(s), your build/test commands,
   commit style, and the review gate. (An example column shows sensible defaults.)
3. Restart Claude Code in that repo (or reload) so it picks up the new agents and command.

That's it. Nothing else is repo-specific — updates to the kit are drop-in because all your settings
live in the config file.

---

## Using it start-to-finish (you only have a roadmap)

This is the flow when the target repo has a roadmap but no task/spec docs yet.

**1. (Optional but recommended) Normalize the roadmap.**
The planner works best when each phase entry has an **enumerated task split** (e.g. *"L — 4 task docs
(1 …; 2 …; 3 …; 4 …)"*) plus clear success criteria. If your roadmap phases are thin, run the architect
once to bring them into shape:
> "Use the **roadmap-architect** agent to normalize Phase 1 of the roadmap into the pipeline's required
> shape (goal, scope, decisions needed, out of scope, success criteria, enumerated task split)."

Review the result — the roadmap is your source of truth.
*(If a phase has no enumeration, the planner will still decompose it into 3–6 tasks itself and show you
the split at the gate; the architect pass just makes that more deliberate.)*

**2. Kick off the phase.**
> `/phase-kickoff 1`

The command will: read your config, decompose the phase into **Tasks** docs (Opus), then **stop and
show you the task list for go/no-go** (your gate). On approval it fans out the **Impl** build orders in
parallel (Sonnet) and assembles the phase **execution prompt** (Haiku), then reports the file paths.

**3. Implement — interactively.**
The pipeline deliberately stops at scaffolding. Open the phase execution prompt (or just work task by
task from the Impl docs) and implement in your main session, where your design discipline and approval
gates live. At the end of each task:
> "Use the **commit-writer** agent to propose a commit message for the current diff."
Review it, then commit yourself.

**4. Next phase.** Repeat from step 2 with `/phase-kickoff 2`, and so on.

---

## Tuning

- **Run fully unattended:** set `gate: none` in the config to skip the task-list stop (specs + prompt
  generate in one shot). Set it back to `tasks` when you want the checkpoint.
- **Different doc layout:** change the path patterns in the config — `{phase}` and `{n}` are substituted
  by the agents.
- **Keep the AI co-author trailer:** set `ai_coauthor_trailer: true` (default is `false`).
- **No conventions doc yet:** leave `conventions` blank; agents infer house style from the code, but a
  `CLAUDE.md` / `AGENTS.md` makes the output markedly better — consider adding one.
- **Change which model a role uses:** edit the `model:` line in that agent's file
  (`opus` / `sonnet` / `haiku`).

---

## Files

```
.claude/
├── pipeline.config.md          ← the only file you edit per repo
├── agents/
│   ├── roadmap-architect.md    (Opus)
│   ├── phase-planner.md        (Opus)
│   ├── spec-writer.md          (Sonnet)
│   ├── prompt-builder.md       (Haiku)
│   └── commit-writer.md        (Haiku)
└── commands/
    └── phase-kickoff.md        (/phase-kickoff <phase-number>)
```
