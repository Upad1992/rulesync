# Session Handoff

<!-- cspell:ignore codearts codeartsdoer codeartsagent CODEARTS dyoshikawa Upad1992 traecn codebuddy oxlint oxfmt tsdown vite forwardable codegraph hezi -->

Last updated: 2026-11-18

This file is the short-lived state of the fork. Read it first in a new session, then `DECISIONS.md`.
Update "Current state", "Completed", and "Next steps" at the end of every session. Do not turn it into a diary.

## Current state

- The 43.9.0 merge is **done** (merge commit `309aa38`, parents `0d8ffe43` + `0cf7642b`), followed by the handoff commit `d836685`. This session (D-019 execution) added **two new commits** on `dev` on top of `d836685`: the verification report `PLATFORM-VERIFICATION.md`, and this handoff/decisions update. Run `git log -4 --oneline` for exact hashes. `main` == `upstream/main` == `0cf7642ba9bb0fe78711bc5697d3024e15be82f2`; `origin/main` = `66422332`, `origin/dev` = `6a99bcba` (unchanged, not pushed, Q13=A).
- The worktree is clean and the session ends on **`dev`**. `feat/codearts-ide` (`2d93b7c`) still carries the older 2026-10-20 copies (P-013). Use `git switch dev` if you land elsewhere.
- Upstream is **43.9.0** (`package.json:3`), 1020 commits ahead of the old `main`. Architecture per D-017 / P-011: rules registrations in `src/features/rules/tool-rule-factories.ts`, `PROCESSOR_REGISTRY` in `src/types/processor-registry.ts`, `vitest` -> `vite-plus/test`, `tsdown`/oxfmt/oxlint -> `vp`, `TraeCommand` extends `FrontmatterMarkdownToolCommand`, new hooks/permissions/checks features.
- `AGENTS.md` / `.claude/settings.json` hold the fork content (`Fork Workflow` / `Session Handoff` sections, `UserPromptSubmit` -> `codegraph prompt-hook`) plus the 43.9.0 text updates. Both were verified byte-identical to the index before the commit, and P-014 did **not** fire: the only `pnpm` command this session was `pnpm dev generate --help`; every isolated verify ran the real CLI via `tsx src/cli/index.ts` directly (P-015), so `prepare` -> `pnpm generate` never re-ran. Verify after any future `pnpm` command.
- `feat/codearts-ide` (`2d93b7c`) still has one commit not merged into `dev`: the `codearts-ide` target (D-014), P-010, and the 2026-10-20 versions of this file and `DECISIONS.md`. Per 3A, no numbering reconciliation.
- Platform manuals live at `/Users/hezi/Workspace/IndependentProject/Agent/user-agents/platforms/rulesync/`: `README.md`, `config.md`, `distribution-example.md`, and `zcode.md` / `trae.md` / `codebuddy.md` / `claude-code.md` / `codearts.md`. Their **path / frontmatter** sections were re-checked against 43.9.0 on 2026-11-18 (D-019); all 8 external manuals were updated in Chinese. Drift concentrated in `trae.md` (43.9.0 added Trae hooks + permissions, see its §9). GUI section-6 steps remain unverified (user task).
  - These 8 files live in the **separate `Agent` git repo** (branch `main`), not this fork. They are updated in place but **left uncommitted there**: that repo has unrelated pre-existing edits (`.gitignore`, `mac/config/zshenv`) and the task's commits target `dev` here. Committing them in the `Agent` repo is a separate, separately authorized action.
- Backups: `/tmp/codebuddy-backups/20261118-112847/project-tree.tar` (handoff round), `/tmp/codebuddy-backups/20261118-104938/project-tree.tar` (merge round), `/tmp/codebuddy-backups/20261118-port-session/` (three handoff docs, 11 original conflicted files with markers, `codearts-ide-src/`, `resolve-file-formats.py`, and all logs: `typecheck-*.txt`, `cicheck-*.txt`, `unit-all.txt`, `e2e-full.txt`, `proc-tests.txt`), `/tmp/codebuddy-backups/20261117-200706/`, `/tmp/codebuddy-backups/20261118-114223-platform-verify/` (this session: pre-change copies of `AGENTS.md`, `.claude/settings.json`, `HANDOFF.md`, `DECISIONS.md`, `CONTEXT.md`, `package.json`, all 8 manuals). Isolated verification artifacts and logs are under `/tmp/rulesync-platform-check/`.

## Completed

- Decision interview Q1-Q13 -> D-015..D-017. Round choices A1/B1/1A/2A/3A and "no extra acceptance scope" recorded as **D-018**; **P-014** added to `DECISIONS.md`.
- Port (D-017, local-first D-016), 43.9.0 as base:
  - `trae-paths.ts`: merged 43.9.0 hooks/permission constants with local CN-first constants; added `TRAE_PERMISSION_DIR_NAME`.
  - `trae-command.ts`: kept `FrontmatterMarkdownToolCommand` base, `getSettablePaths({global})` back to `getTraeCommandsDirPath`.
  - `utils/trae.ts`: added `getTraePermissionDirPath`; `trae-permissions.ts` `getSettablePaths` now CN-first (Q12).
  - `tool-rule-factories.ts`: added the missing `codearts-cli` entry (tuple had it; factory map did not).
  - `codearts-cli-command.ts` + test: dropped `fileContent` (43.9.0 `RulesyncCommandParams` no longer accepts it).
  - `codearts-ide` target restored from `2d93b7c` and re-based onto 43.9.0: 3 new files + `mcp-processor.ts` entry + mcp tuple + `tool-display.ts` + `tool-targets.test.ts` + `mcp-processor.test.ts` + `e2e-mcp.spec.ts` + file-formats prose.
  - CN-first tests restored; 7 target-list assertions updated for `codearts-cli`; rules global length 51 -> 52; `vitest` -> `vite-plus/test` imports in 9 local test files.
- **Q12 regression assertion**: `trae-permissions.test.ts` "resolves the Trae CN user root for the permission file (Q12)" — passes and distinguishes upstream-as-is (A) from local-first (B).
- Generated artifacts (`generate:docs-content`, `generate:tables`, `pnpm dev gitignore`) re-run, staged, idempotency confirmed; README / supported-tools tables and `.gitignore` include `codearts-ide` and `.codeartsdoer/mcp/mcp_settings.json`.
- Each File Format prose restored via `resolve-file-formats.py`; `AGENTS.md:46` points at `tool-rule-factories.ts`; the singular `additionalConvention` is upstream's own wording and is left unchanged (D-015).
- **Merge round**: fresh `pnpm cicheck` green after one reproduced flaky, P-014 verified (no restore needed), `git add -A`, single merge commit `309aa38`, all 7 success criteria passed, switched back to `feat/codearts-ide`.
- **Handoff round**: user approved the real-platform verification plan (**D-019**) but deferred execution to a new session. That session only updated `HANDOFF.md` / `DECISIONS.md` on `dev` and committed them; no `pnpm` command was run.
- **D-019 execution round (this session)**: see Verification below. Produced `PLATFORM-VERIFICATION.md` (drift list, six-target evidence, per-platform GUI checklist), updated all 8 external platform manuals in Chinese (Trae hooks/permissions drift, command-frontmatter tool-block requirement, version stamps), appended **D-020 / P-015 / P-016** to `DECISIONS.md`, and added `hezi` to the `cspell:ignore` comments of `HANDOFF.md` / `DECISIONS.md` (the word was introduced by `d836685` but never cspell-checked). No fork source or committed `rulesync.jsonc` was changed.

## Verification

- Fresh `pnpm cicheck` before the merge commit: **EXIT=0** — 623 files / 17062 passed | 4 skipped; fmt:check, oxlint, typecheck, check:sync-skill-docs, check:docs-content, check:gitignore, check:supported-tools, cspell (0 issues), secretlint.
  - First run failed only on `src/lib/watch.test.ts > watchTargets > forwards changes under a symlinked subdirectory` (`waitFor` 10s timeout). Standalone reproduction: **33/33 passed** (that case took 29ms), so it is a concurrency flake, not a code defect. No source was changed and no test was bypassed.
- E2E matrix (previous session, code unchanged since): **28 spec files / 1538 tests passed** (`e2e-full.txt`), including `e2e-mcp.spec.ts` (codearts-ide) and `e2e-trae-home.spec.ts` (CN-first). It covers `codearts-cli`, `codearts-ide` and `trae` rules/skills/commands/subagents/mcp/hooks/permissions in both project and home scope.
- Generated-artifact drift: none (`git status --porcelain` empty; `git diff --exit-code` clean).
- Q12 assertion (`src/features/permissions/trae-permissions.test.ts:80`): passes.
- 7 success criteria all passed: `main == upstream/main`; `git merge-base --is-ancestor main dev` exit 0; cicheck green; E2E green; no drift; Q12 passes; `origin/main` / `origin/dev` unchanged.
- **Real-platform verification (D-019, this session)** — all six targets (`zcode`, `trae`, `codebuddy`, `claudecode`, `codearts-cli`, `codearts-ide`) ran dry-run -> generate -> check with `--features "*"` in an isolated project; 18 commands exit 0, every `generate --check` `hasDiff=false`. Dry-run planned paths == files written. Evidence in `PLATFORM-VERIFICATION.md`.
  - `--config` path-traversal guard forced running the real CLI via `tsx src/cli/index.ts` with cwd = isolated project (P-015); `pnpm dev generate --help` confirmed all flags.
  - Global scope (`HOME_DIR` -> pseudo-home): Trae CN-first skills/commands/subagents -> `.trae-cn/`, codearts-cli global -> `.codeartsdoer/`, all successful runs `--check` clean. Real home: symlinks/config fingerprints identical, top-level name list identical (153 entries); only 4 `.codebuddy/` host-runtime mtime lines differ.
  - **Two new Trae defects found by real CLI only**: (1) CN home + `generate --global --features permissions` fails — `SHARED_CONFIG_OWNERSHIP` lacks `.trae-cn/permission/global.json` (P-016); (2) global hooks are not CN-first (`.trae/hooks.json`). Unit Q12 test + E2E do not cover these. Recorded, not fixed (source out of scope).
  - Manual drift: Trae hooks/permissions added in 43.9.0; command `argument-hint` etc. must be in the `<target>:` block (top-level keys dropped). Manuals updated; see `PLATFORM-VERIFICATION.md` §3.
  - cspell (`--no-progress --gitignore .`) + secretlint pre-checked on new/changed docs: 0 issues after adding `hezi` to the ignore comments.
  - **Not done (by design)**: GUI section-6 verification — handed to the user as an unchecked checklist in `PLATFORM-VERIFICATION.md` §4. Not performed, not marked verified. No full `pnpm cicheck` / E2E re-run this session (code unchanged, per plan).

## Next steps

D-019 is executed (see Completed / Verification). What remains, in priority order:

1. **User performs the GUI verification** in `PLATFORM-VERIFICATION.md` §4 (per-platform: ask the model for a rule marker, Settings -> Skills/Commands, `/mcps` Connected, call one MCP tool, delegate a subagent). Every box is unchecked; the agent did not do these and must not fill ✅ on the user's behalf. Await the user's report, then record real results in the manuals / a follow-up decision.
2. **Decide whether to fix the two Trae 43.9.0 defects** (P-016): (a) add a `SHARED_CONFIG_OWNERSHIP` declaration for `.trae-cn/permission/global.json` so CN-home global permissions generate; (b) make global Trae hooks CN-first, or document the divergence as intentional. Both are fork **source** changes — out of scope for D-019/D-020, need separate authorization. If fixed, add a regression test that reaches the real `--global` gateway write (current Q12 unit + E2E do not).
3. Still deferred from earlier rounds: D-014 / P-010 numbering reconciliation and the two handoff-document versions when `feat/codearts-ide` is merged (3A / P-013). Do NOT push `main` or `dev` (Q13=A) without separate authorization.
4. Before any future `pnpm` command, remember P-014 (regenerates `AGENTS.md` / `.claude/settings.json`) and P-015 (isolated `--config` runs). `origin/main` / `origin/dev` intentionally unchanged.

## Environment facts

- `git config http.proxy` = `socks5h://127.0.0.1:7892`. Fetching a large pack over default HTTP/2 failed (`RPC failed; curl 18 Transferred a partial file`); `git -c http.version=HTTP/1.1 fetch` works. Prefer shell config files over `launchctl setenv` for CLI environment variables.
- `~/.codeartsdoer/installers/bin/codearts` is the CLI binary. The shell also defines a `codearts` function that injects `CODEARTS_CLI_AK` / `CODEARTS_CLI_SK` from Keychain.
- `~/.codeartsdoer/AGENTS.md` is a symlink into the old aggregation repo. Do not write through it without checking the link target.
- CodeArts CLI and the CodeArts Agent IDE share `.codeartsdoer/` for rules, skills, commands and agents; the IDE reads MCP from `.codeartsdoer/mcp/mcp_settings.json`.
- `~/.trae/` does not exist on this machine (measured 2026-11-18); `~/.trae-cn/` is the real Trae user config, which is why CN-first detection (D-003) is required.
- `pnpm dev generate --help` is the authoritative source for 43.9.0 CLI flags; `dev:docs/reference/cli-commands.md` documents `--targets` / `--features` / `--dry-run` / `--check` / `--input-roots` / `--output-roots`.

## Known issues

- P-005 still applies: `check:docs-content` compares the worktree to the index, so stage documentation changes before running `pnpm cicheck`.
- P-011 through P-016 are in `DECISIONS.md`; read them there. P-014 is the `pnpm generate` side-effect, P-015 the isolated-`--config` invocation gotcha, P-016 the Trae CN-first permissions/hooks defect.
- The platform manuals' section 6 checklists contain GUI-only steps; an agent cannot perform them (D-019). The consolidated unchecked checklist is `PLATFORM-VERIFICATION.md` §4.
