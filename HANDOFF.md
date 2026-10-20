# Session Handoff

<!-- cspell:ignore codearts codeartsdoer codeartsagent CODEARTS -->

Last updated: 2026-10-20

This file is the short-lived state of the fork. Read it first in a new session, then `DECISIONS.md`.
Update "Current state", "Completed", and "Next steps" at the end of every session. Do not turn it into a diary.

## Current state

- `feat/codearts-ide` is checked out at `0d8ffe43` and carries the `codearts-ide` MCP target (D-014). It is uncommitted at the time of writing.
- `dev` still points at `0d8ffe43` and carries the `codearts-cli` target (D-013) from `60b7c0f8`.
- `main` is still the upstream mirror at `66422332`, identical to `origin/main`.
- The working tree contains the IDE target, its tests, docs and regenerated artifacts; everything is staged.

## Completed

- Added the `codearts-ide` target: MCP only, project scope, `.codeartsdoer/mcp/mcp_settings.json` under `mcpServers` (D-014). Local servers use `command`/`args`/`env`/`disabled`, remote servers use `url`/`headers`/`type` (`sse` or `streamableHttp`), and `autoApprove` and other top-level keys survive.
- Verified the IDE surfaces before choosing the shape: the IDE reads the project-root `AGENTS.md` and `~/.codeartsdoer/AGENTS.md` (runtime logs), shares skills/commands/agents paths with the CLI, and reads MCP from the `mcpServers` file above.
- Reworked the tool-target union, MCP factory metadata, display labels, processor tests, E2E matrix and a dedicated E2E case.
- Deferred on purpose: the IDE rule center (`.codeartsdoer/rule/*.mdc` + `metadata.properties`), IDE global MCP, hooks and permissions.
- Earlier on `feat/codearts-cli` (now `dev`): rules, skills, commands, subagents and MCP for CodeArts CLI, including tests, docs and generated artifacts (D-013).

## Verification

- `pnpm cicheck`: passed (574 files, 15,227 passed, 4 skipped; docs-content, gitignore, supported-tools and cspell drift checks clean).
- `pnpm typecheck`: clean.
- New unit tests: 5 passed; MCP processor + target enum tests: 104 passed.
- E2E `e2e-mcp` (project and global): 194 passed.
- Manual IDE verification is still pending; see Next steps.

## Next steps

1. Commit the `codearts-ide` target and merge it into `dev`.
2. Manually verify in the real IDE: open a scratch project, generate a server, confirm the MCP panel lists it and a tool call succeeds. Do not write `~/.codeartsdoer` without replacing the `AGENTS.md` symlink first (P-002).
3. Rule center follow-up: verify that a generated `.mdc` plus `metadata.properties` (`projectExpert=[...]`, `triggerType: "always"`) is actually injected, then decide whether it belongs to `codearts-ide` or a shared surface. Watch the `rules`/`rule` path mismatch (P-010).
4. IDE global MCP follow-up: test `~/.codeartsdoer/mcp/mcp_settings.json` with a fake home or a backup; `~/.config/opencode/mcp/mcp_settings.json` is the UI path but collides with OpenCode.
5. Hooks (TypeScript plugins) and permissions (global storage) remain out of scope.

## Environment facts

- `~/.codeartsdoer/installers/bin/codearts` is the CLI binary. The shell also defines a `codearts` function that injects `CODEARTS_CLI_AK` / `CODEARTS_CLI_SK` from Keychain.
- `~/.codeartsdoer/AGENTS.md` is a symlink into the old aggregation repo. Do not write through it without checking the link target.
- CodeArts CLI and the CodeArts Agent IDE share `.codeartsdoer/` for rules, skills, commands and agents; the IDE reads MCP from `.codeartsdoer/mcp/mcp_settings.json` and the CLI from `.codeartsdoer/codearts_cli.json`.
- The IDE's own MCP panel opens `~/.config/opencode/mcp/mcp_settings.json` for the "personal" scope, and its rule-center migration writes `.codeartsdoer/rules/` while the UI reads `.codeartsdoer/rule/` (P-010).
- `~/.trae/` is still an empty stub; `~/.trae-cn/` remains the real Trae user config.

## Known issues

- P-005 still applies: `check:docs-content` compares the worktree to the index, so stage documentation changes before running `pnpm cicheck`.
