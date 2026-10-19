# Session Handoff

<!-- cspell:ignore codearts codeartsdoer codeartsagent CODEARTS -->

Last updated: 2026-10-19

This file is the short-lived state of the fork. Read it first in a new session, then `DECISIONS.md`.
Update "Current state", "Completed", and "Next steps" at the end of every session. Do not turn it into a diary.

## Current state

- `feat/codearts-cli` carries the CodeArts CLI implementation (D-013): rules, skills, commands, subagents and MCP, project and global scope. It is uncommitted at the time of writing.
- `dev` still points at `7cea952a` (Trae subagent support). `feat/codearts-cli` was branched from it and has not been merged back.
- `main` is still the upstream mirror at `66422332`, identical to `origin/main`.
- The CodeGraph `UserPromptSubmit` hook in `.claude/settings.json` is committed (`8ee6e05`); the working tree is clean.

## Completed

- Added the `codearts-cli` target:
  - Rules: project `./AGENTS.md`, global `~/.codeartsdoer/AGENTS.md`, `collisionPolicy: "fold"`.
  - Skills: `.codeartsdoer/skills/<name>/SKILL.md`, only `name` + `description` written.
  - Commands: `.codeartsdoer/commands/<name>.md`, `description` + `codearts-cli:` block (`agent`/`model`/`subtask`).
  - Subagents: `.codeartsdoer/agents/<name>.md`, `mode` defaults to `subagent`, `tools` is a map.
  - MCP: `mcp` key of `.codeartsdoer/codearts_cli.json`, local/remote mapping, other top-level keys preserved.
- Registration: five tuples, `TOOL_DISPLAY`, processor factories and meta.
- Tests: 20 new unit tests; processor and target-enum expectations updated; five E2E specs cover project and global scope (943 tests passed).
- Docs and generated artifacts: `docs/reference/file-formats.md`, cspell entries, supported-tools tables, README, `docs-content.ts`, `.gitignore`.
- Real CLI probe: generation into `/tmp/codearts-verify` produced the five expected files, and a manual TUI run in this repository confirmed all five features load (see Verification).

## Verification

- `pnpm typecheck`: clean.
- New unit tests: 20 passed.
- Processor + enum tests: 760 passed, 1 skipped.
- E2E (`e2e-rules`, `e2e-skills`, `e2e-commands`, `e2e-subagents`, `e2e-mcp`): 943 passed.
- `oxlint` and `oxfmt --check` on the new files: clean.
- `pnpm cicheck`: passed (573 files, 15,221 passed, 4 skipped; docs-content, gitignore and supported-tools drift checks clean). One earlier run hit the flaky `src/lib/watch.test.ts` symlink case; it passed alone and in the next full run.
- Manual CodeArts TUI verification in this repository passed: the model quoted `# Rulesync Project Overview`, `/probe` returned `PROBE_COMMAND_OK`, `probe-skill` returned `PROBE_SKILL_OK`, both MCP servers showed `Connected`, and delegating to `code-reviewer` returned `SUBAGENT_CODE_REVIEWER_OK`.

## Next steps

1. `feat/codearts-ide` is checked out at `45ec2d8a`; start the IDE adaptation by verifying the IDE MCP and rule-center surfaces before choosing a target shape.
2. Before any real global generate, replace the `~/.codeartsdoer/AGENTS.md` symlink into the old aggregation repo; otherwise generation writes through it (P-002).
3. Add a `codearts-ide` target only for IDE-specific surfaces (MCP at `.codeartsdoer/mcp/mcp_settings.json`, and the `.codeartsdoer/rule/*.mdc` center if verified); do not duplicate the shared skills/agents/commands paths already emitted by `codearts-cli`.
4. Hooks (TypeScript plugins) and permissions (global storage) remain out of scope.

## Environment facts

- `~/.codeartsdoer/installers/bin/codearts` is the CLI binary. The shell also defines a `codearts` function that injects `CODEARTS_CLI_AK` / `CODEARTS_CLI_SK` from Keychain.
- `~/.codeartsdoer/AGENTS.md` is a symlink into the old aggregation repo. Do not write through it without checking the link target.
- CodeArts CLI and the CodeArts Agent IDE share `.codeartsdoer/` for rules, skills, commands and agents; the IDE reads MCP from `.codeartsdoer/mcp/mcp_settings.json`.
- `~/.trae/` is still an empty stub; `~/.trae-cn/` remains the real Trae user config.

## Known issues

- P-005 still applies: `check:docs-content` compares the worktree to the index, so stage documentation changes before running `pnpm cicheck`.
