# Real-Platform Verification (43.9.0)

<!-- cspell:ignore codearts codeartsdoer codeartscli traecn codebuddy claudecode zcode streamableHttp RunCommand customProfiles resourceAuthorization mcpServers codebuddycode codeartsdoer tsx oxlint oxfmt cicheck vp hasDiff codegraph -->

Verified 2026-11-18 against rulesync 43.9.0 (`dev` HEAD `d836685`). Covers the
six fork-relevant targets: `zcode`, `trae`, `codebuddy`, `claudecode`,
`codearts-cli`, `codearts-ide`. The manuals were last checked against `2d93b7cd`
(2026-10-20); this record is the drift review against 43.9.0.

**GUI steps are NOT performed here.** Section 4 is a checklist handed to the
user; nothing in it is marked verified.

## 1. Method (isolation)

- Isolated project `/tmp/rulesync-platform-check/project/` with minimal
  `.rulesync/` sources (rules, skills, commands, subagents, `mcp.jsonc`,
  `hooks.jsonc`, `permissions.jsonc`) carrying unique marker strings.
- Pseudo-home `/tmp/rulesync-platform-check/home/` via `HOME_DIR`; `.trae-cn/`
  created to exercise CN-first resolution (Q12 equivalent).
- Inputs/outputs pinned with `--config`, `--input-roots`, `--output-roots`; each
  target writes to its own `out/<target>/` root so shared root files
  (`AGENTS.md`, `.mcp.json`) do not collide across targets.
- The committed `rulesync.jsonc` was never edited; targets were selected only
  via `--targets` / `--features`. No fork source code was changed.
- The real CLI ran as `tsx src/cli/index.ts` (exactly what `pnpm dev` wraps) with
  cwd = the isolated project: `pnpm -C` keeps cwd at the repo root, and the
  path-traversal guard (`config-resolver.ts:510`) then rejects an absolute
  `--config`. All shell commands carried the `rtk` prefix.
- The real home was never a generation target: `~/.codeartsdoer/AGENTS.md` and
  `~/.trae-cn/user_rules` are symlinks into the aggregation repo (P-002), and
  `delete: true` would write through them.

`pnpm dev generate --help` confirmed `--global`, `--config`, `--targets`,
`--features`, `--input-roots`, `--output-roots`, `--dry-run`, `--check` all exist
in 43.9.0.

## 2. Six-target project scope (measured)

Per target: `generate --features "*" --dry-run` -> `generate` ->
`generate --check`. All 18 commands exited 0; every `--check` reported
`hasDiff=false` (no drift). Dry-run planned paths == actual files written.

| Target | Dry-run write paths (relative to output root) |
| --- | --- |
| `zcode` | `AGENTS.md`, `.zcode/config.json` (mcp+hooks), `.zcode/commands/review.md`, `.zcode/agents/reviewer.md`, `.zcode/skills/demo-skill/SKILL.md`, `.../scripts/run.sh` |
| `trae` | `.trae/rules/overview.md`, `.trae/rules/typescript.md`, `.trae/skills/demo-skill/SKILL.md`, `.../scripts/run.sh`, `.trae/commands/review.md`, `.trae/agents/reviewer.md`, `.trae/mcp.json`, **`.trae/hooks.json`** |
| `codebuddy` | `CODEBUDDY.md`, `.codebuddy/rules/typescript.md`, `.codebuddy/skills/demo-skill/SKILL.md`, `.../scripts/run.sh`, `.codebuddy/commands/review.md`, `.codebuddy/agents/reviewer.md`, `.mcp.json`, `.codebuddy/settings.json` (hooks+permissions) |
| `claudecode` | `CLAUDE.md`, `.claude/rules/typescript.md`, `.claude/skills/demo-skill/SKILL.md`, `.../scripts/run.sh`, `.claude/commands/review.md`, `.claude/agents/reviewer.md`, `.mcp.json`, `.claude/settings.json` (hooks+permissions) |
| `codearts-cli` | `AGENTS.md`, `.codeartsdoer/skills/demo-skill/SKILL.md`, `.../scripts/run.sh`, `.codeartsdoer/commands/review.md`, `.codeartsdoer/agents/reviewer.md`, `.codeartsdoer/codearts_cli.json` |
| `codearts-ide` | `.codeartsdoer/mcp/mcp_settings.json` |

Unsupported-feature warnings (measured, `--features "*"`):

- `zcode`: ignore, checks, permissions unsupported.
- `trae`: checks unsupported; permissions **global scope only**.
- `codebuddy`: ignore, checks unsupported.
- `claudecode`: checks unsupported (ignore still accepted, deprecated).
- `codearts-cli`: ignore, hooks, checks, permissions unsupported.
- `codearts-ide`: only mcp; all other features unsupported.

Content/frontmatter spot-checks (measured): folded root rules (`AGENTS.md` for
zcode/codearts-cli, `CODEBUDDY.md`, `CLAUDE.md`); modular rule frontmatter
(`paths` for claudecode/codebuddy, `alwaysApply`/`globs` comma-string for Trae);
`settings.json` `allow`/`ask`/`deny` and `$schema` (claudecode); ZCode
`mcp.servers` + `hooks.events`; CodeArts CLI `mcp` (local `command` array +
`environment`, remote `url`) and IDE `mcpServers` (`streamableHttp` inferred).

## 3. Drift list: manuals (2d93b7cd) vs 43.9.0

Only the **path** and **frontmatter** sections were re-reviewed, per the
manuals' maintenance convention. "Match" = dry-run paths/actual frontmatter
agree with the manual.

### 3.1 `trae.md` — MAJOR drift (43.9.0 added hooks and permissions)

1. §0 "先看结论" and §1 support matrix state Trae supports only
   rules/skills/commands/subagents/mcp/ignore and **"不支持 hooks、permissions、
   checks"**. Measured 43.9.0: `checks` still unsupported, but **hooks** and
   **permissions** are now supported. `ignore` still supported (`.trae/.ignore`,
   deprecated in favor of permissions), `mcp` still project-only.
2. §2 "目录总览" is missing two rows: `.trae/hooks.json` (project + global) and
   `~/.trae[-cn]/permission/global.json` (global only). `trae-paths.ts:28` and
   `:60-62` define `TRAE_HOOKS_FILE_NAME` / `TRAE_PERMISSION_*`.
3. §3.8 "rulesync 不生成的原生面" claims "hooks / permissions：未找到 Trae 的
   声明式配置路径" — no longer true.
4. §4.1 global `rulesync.jsonc` example lists only `skills, commands,
   subagents`; §4.2 "全局路径" table is missing hooks/permissions rows.
5. §3.4 commands: 43.9.0 writes a `name:` key into generated command
   frontmatter (measured: `name: review`); the manual example shows only
   `description`. Minor.
6. §3.2 rules frontmatter (`alwaysApply`, `globs` comma-string, `description`)
   and §3.5 subagent `trae:` block promotion (`model`/`tools`/
   `disallowedTools`/`mcpServers` -> top level) both still **match** (measured).
7. New hooks shape (measured): `.trae/hooks.json` uses PascalCase events
   (`SessionStart`, `PreToolUse`, `Stop`) nested under `hooks`, with canonical
   matcher `Bash` mapped to `RunCommand`. The manual has no hooks section at all.
8. New permissions shape (measured): `permission/global.json` carries
   `customProfiles.defaultCustomProfile.approval.commandRules`/`mcpRules` and
   `resourceAuthorization.network`; only `bash`, `webfetch`, `mcp__*` categories
   map — `read`/`edit` are skipped with a warning. Per
   `trae-permissions.ts:404` and `shared-config-gateway.ts:1408`.

### 3.2 Two NEW Trae runtime findings (recorded, not fixed — source is out of scope)

- **CN-first + global permissions fails.** With `HOME_DIR` containing
  `.trae-cn/`, `generate --global --targets trae --features permissions` exits 1:
  `Shared config file '.trae-cn/permission/global.json' has no
  SHARED_CONFIG_OWNERSHIP declaration`. The ownership table
  (`shared-config-gateway.ts:1408`) declares only the international
  `.trae/permission/global.json`; `getTraePermissionDirPath` resolves the CN
  path. The Q12 unit test (`trae-permissions.test.ts:80`) only asserts
  `getSettablePaths`, and the E2E test (`e2e-permissions.spec.ts:2932`) uses a
  fresh home without `.trae-cn`, so neither covers the gateway write.
- **Global hooks are NOT CN-first.** `TraeHooks.getSettablePaths`
  (`trae-hooks.ts:80`) always returns `.trae/hooks.json`; measured: with a CN
  home, skills/commands/subagents land under `.trae-cn/` but hooks land under
  `.trae/hooks.json`. Inconsistent with the other user-scope Trae features.

### 3.3 Command frontmatter drift (all Claude-family / ZCode manuals)

Measured: a top-level `argument-hint` in `.rulesync/commands/*.md` is **dropped**
from the generated command; it must be written inside the tool-specific block
(`claudecode:` / `codebuddy:` / `zcode:`) to be emitted. With the block, the
same key appears verbatim (measured for all three). `README.md` general concept
§1 already states tool-specific fields belong in the `<target>:` block, so the
per-platform command examples are the stale part:

- `claude-code.md` §4.4: "`allowed-tools`、`model` 等可直接写在顶层" — measured
  top-level keys are dropped.
- `codebuddy.md` §3.4: example puts `argument-hint` at top level — measured
  dropped; must be in `codebuddy:`.
- `zcode.md` §3.4: "只支持 `description` 与 `argument-hint` 两个 frontmatter
  键" — measured `argument-hint` only survives in the `zcode:` block.

### 3.4 Targets with NO path/frontmatter drift (measured)

- `zcode.md`: all §1/§2 paths match; `mcp.servers` / `hooks.events` match;
  ignore/permissions/checks unsupported as documented.
- `codebuddy.md`: all paths match; `settings.json` hooks+permissions and
  `allow`/`ask`/`deny` match; ignore/checks unsupported as documented.
- `claude-code.md`: all paths match; `$schema`, `paths`, settings.json match;
  checks unsupported, ignore -> `permissions.deny` as documented.
- `codearts.md`: both CLI and IDE paths match; CLI `mcp` (array `command`,
  `environment`), IDE `mcpServers` (`streamableHttp`), `mode: subagent` default,
  skill `name`+`description` only — all match.
- `config.md`: `features` table (`checks`, deprecated `ignore`) still accurate.
- `README.md` §通用概念 and `distribution-example.md`: general rules/frontmatter
  and per-platform target trees consistent with measured 43.9.0 output (the
  Trae tree there omits hooks only because that example has no hooks source).

### 3.5 Version stamps

All eight manuals say "最后核对：2026-10-20，rulesync 提交 `2d93b7cd`". This
review re-checked only the path/frontmatter sections against 43.9.0 on
2026-11-18; the stamp should say so rather than imply a full re-verification.

## 4. Per-platform GUI manual-verification checklist (NOT performed)

Handed to the user. The agent must not perform these, mark them done, or fill
any ✅. For each target, after generating into a throwaway project, confirm in
the real client:

| Target | Ask the model about a rule | Settings -> Skills / Commands | `/mcps` / MCP panel = Connected | Actually call one MCP tool | Delegate a subagent, check the reply |
| --- | --- | --- | --- | --- | --- |
| `zcode` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `trae` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `codebuddy` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `claudecode` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `codearts-cli` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `codearts-ide` | [ ] | [ ] | [ ] | [ ] | [ ] |

Notes for the person running these:

- Trae: the Rules panel should also show the new project hooks path and, on a
  CN machine, the permission file under `~/.trae-cn/permission/`. Global
  permissions on a CN home currently fail to generate (§3.2), so that row
  cannot be completed until the ownership declaration is added.
- CodeArts CLI: `mode: subagent` agents do not appear in the agent picker
  (P-009) — verify by delegation, not by listing. MCP via `/mcps` should read
  `.codeartsdoer/codearts_cli.json`; the IDE reads
  `.codeartsdoer/mcp/mcp_settings.json`.
- ZCode: project-level commands/skills/subagents paths are still marked 🟡 in
  the manual (inferred from the user-level docs); only GUI loading can upgrade
  them to ✅. This record confirms only that rulesync writes them.
- Ask-the-model check: the generated root files contain marker strings
  (`MARKER_ROOT_OVERVIEW_4390`, etc.); ask the client to quote one.

## 5. Global scope (measured)

- `HOME_DIR` -> pseudo-home. `generate --global` overrides `outputRoots` with
  `getHomeDirectory()` (`config-resolver.ts:699-709`), so all global artifacts
  landed in the pseudo-home.
- Trae CN-first (Q12 equivalent, measured): with `.trae-cn/` present, global
  skills/commands/subagents resolve to `.trae-cn/...`; permissions resolve to
  `.trae-cn/permission/global.json` but hit the ownership-gap error above.
- `codearts-cli --global` (measured) wrote
  `.codeartsdoer/{AGENTS.md,skills,commands,agents,codearts_cli.json}` into the
  pseudo-home — matches `codearts.md` §4.2.
- Successful global runs passed `--check` (`hasDiff=false`): Trae
  skills/commands/subagents/hooks on a CN home; Trae permissions on an INTL
  home; codearts-cli all features.

## 6. Real home unchanged (measured)

Focused before/after snapshot of `~/.codeartsdoer`, `~/.trae-cn`, `~/.trae`,
`~/.claude`, `~/.codebuddy`, `~/.zcode`:

- All symlinks, config-file SHA-256 fingerprints, symlink-target content hashes,
  and presence markers are **identical** (`PROTOCOL_LINES_IDENTICAL`).
- The top-level file-name list is **identical** (153 entries,
  `NAME_LIST_IDENTICAL`).
- The only diffs were four `ls -la` mtime/link-count lines in `.codebuddy/`
  host-runtime state dirs (`app`, `local_storage`, `sessions`, `tasks`) — the
  CodeBuddy host's own bookkeeping during this session, not rulesync output
  paths. No new rulesync output appeared in the real home.

## 7. Success criteria

- Six targets' dry-run paths match the manuals or differences recorded (§2, §3).
- `--check` no drift for all six targets and for successful global runs.
- Global artifacts in pseudo-home; real home file list unchanged (§5, §6).
- Drift list (§3) + GUI checklist (§4) produced; GUI not performed.
- `AGENTS.md` (Fork Workflow / Session Handoff sections) and
  `.claude/settings.json` (`UserPromptSubmit` -> `codegraph prompt-hook`)
  preserved — no `pnpm generate` re-fired after restore.
