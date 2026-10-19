import { join } from "node:path";

/**
 * Trae (ByteDance's AI IDE, "TraeCode" in its current docs) keeps project
 * configuration under `.trae/` and user configuration under `~/.trae/`.
 *
 * @see https://docs.trae.ai/ide/rules?_lang=en
 * @see https://docs.trae.ai/ide/skills?_lang=en
 * @see https://docs.trae.ai/ide/add-mcp-servers?_lang=en
 * @see https://docs.trae.ai/ide/slash-commands?_lang=en
 * @see https://docs.trae.ai/ide/ignore-files?_lang=en
 */
export const TRAE_DIR = ".trae";

/**
 * Trae CN (the mainland-China edition) keeps its user-level configuration
 * under `~/.trae-cn/` instead of `~/.trae/`. Both editions share the
 * project-level `.trae/` directory.
 */
export const TRAE_CN_USER_DIR = ".trae-cn";

/** Project MCP servers (`mcpServers` object), project scope only. */
export const TRAE_MCP_FILE_NAME = "mcp.json";

export const TRAE_SKILLS_DIR_NAME = "skills";

/** Skills: `.trae/skills/<name>/SKILL.md` (project) and `~/.trae/skills/` (global). */
export const TRAE_SKILLS_DIR_PATH = join(TRAE_DIR, TRAE_SKILLS_DIR_NAME);

export const TRAE_COMMANDS_DIR_NAME = "commands";

/**
 * Custom commands: Markdown files under `.trae/commands/` (project, up to three nested
 * directory levels) and `~/.trae/commands/` (global).
 */
export const TRAE_COMMANDS_DIR_PATH = join(TRAE_DIR, TRAE_COMMANDS_DIR_NAME);

export const TRAE_AGENTS_DIR_NAME = "agents";

/**
 * Subagents: Markdown files with YAML frontmatter under `.trae/agents/`
 * (project) and the user-level agents directory (global). The layout is flat:
 * Trae documents no nested agent directories.
 *
 * @see https://docs.trae.ai/ide/subagents
 * @see https://docs.trae.cn/ide_subagents
 */
export const TRAE_AGENTS_DIR_PATH = join(TRAE_DIR, TRAE_AGENTS_DIR_NAME);

/** Indexing ignore list (gitignore syntax), `.trae/.ignore`, project scope only. */
export const TRAE_IGNORE_FILE_NAME = ".ignore";
