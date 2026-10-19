# Session Handoff

<!-- cspell:ignore codearts codeartsdoer codeartsagent CODEARTS -->

Last updated: 2026-10-19

This file is the short-lived state of the fork. Read it first in a new session, then `DECISIONS.md`.
Update "Current state", "Completed", and "Next steps" at the end of every session. Do not turn it into a diary.

## Current state

- `dev` now contains the Trae subagent work at `7cea952a` (fast-forwarded from `feat/trae-subagent`).
- `feat/codearts-cli` was created from `dev` at `7cea952a` and is the working branch for the CodeArts CLI adaptation. No CodeArts implementation has started.
- `main` is still the upstream mirror at `66422332`, identical to `origin/main`.
- `.codebuddy/settings.local.json` was formatted in `0b9f50bd`; `pnpm cicheck` passes on the merged tree.
- The only uncommitted change is the pre-existing local hook edit in `.claude/settings.json`; leave it alone.

## Completed

- Trae subagent support is merged into `dev` (D-012). The previous session's unit, E2E and `pnpm cicheck` results still describe the merged tree.
- Read-only CodeArts CLI research for the next session (no code changes):
  - Binary: `~/.codeartsdoer/installers/codearts`. User config root: `~/.codeartsdoer/`; project root: `.codeartsdoer/`.
  - Skills: `.codeartsdoer/skills/<name>/SKILL.md` (project) and `~/.codeartsdoer/skills/` (user).
  - Commands: `.codeartsdoer/commands/<name>.md` (project) and `~/.codeartsdoer/commands/` (user); `codearts_cli.json(c)` also has a `command` block.
  - Agents: `.codeartsdoer/agents/<name>.md` (project) and `~/.codeartsdoer/agents/` (user). `description` and `mode` (`subagent` | `primary`) are required; `model` and `tools` (a tool-name map) are optional.
  - MCP: `codearts_cli.json(c)` at the project and user roots, under an `mcp` key; Claude Code format is supported.
  - Rules: project `AGENTS.md` and `~/.codeartsdoer/AGENTS.md` appear to be the rule surfaces; `~/.codeartsdoer/rule/` and cache directories exist. The exact rule resolution order still needs to be read.
  - Docs: `https://support.huaweicloud.com/usermanual-cli/codeartsagent_cli_0019.html` (skills), `.../codeartsagent_cli_0031.html` (agents), `.../codeartsagent_cli_0010.html` (commands). The PDF user guide covers permissions (section 4), hooks (section 9) and MCP (section 10).
  - Local `~/.codeartsdoer/` has `skills/`, an empty `agents/`, `codearts_cli.json`, `rule/`, and a symlinked `AGENTS.md`; there is no project `.codeartsdoer/` in rulesync yet.

## Verification

- The merged `dev` tree passed `pnpm cicheck` (15,197 passed, 4 skipped) before the merge; the merge was a fast-forward with no conflicts.
- CodeArts research was read-only; nothing to verify yet.

## Next steps

1. Start a new session on `feat/codearts-cli`.
2. Decide the feature scope for CodeArts (rules, skills, commands, subagents, MCP, hooks, permissions, ignore) before writing code.
3. Read the remaining official docs (permissions, hooks, MCP, rules) and inspect files the local CodeArts CLI actually reads or writes.
4. Implement with the same constraints as the Trae work: small diff, project/user scope where supported, tests, docs, generated tables, and no changes to shared output-root logic without evidence.
5. Before a real global generate, remove the `~/.trae-cn/skills/grill-with-docs` symlink (P-002).

## Environment facts

- `~/.codeartsdoer/installers/codearts` is the CLI binary. The shell also defines a `codearts` function that injects `CODEARTS_CLI_AK` / `CODEARTS_CLI_SK` from Keychain.
- `~/.codeartsdoer/AGENTS.md` is a symlink into the old aggregation repo. Do not write through it without checking the link target.
- `~/.trae/` is still an empty stub; `~/.trae-cn/` remains the real Trae user config.

## Known issues

- `.claude/settings.json` carries an uncommitted local `UserPromptSubmit` hook; leave it alone unless the user asks.
- P-005 still applies: `check:docs-content` compares the worktree to the index, so stage documentation changes before running `pnpm cicheck`.
