import { join } from "node:path";

/**
 * CodeArts CLI (Huawei's "码道" agent CLI) keeps project configuration under
 * `.codeartsdoer/` and user configuration under `~/.codeartsdoer/`.
 *
 * The same root is shared with the CodeArts Agent IDE for rules, skills,
 * commands and subagents; only the MCP file differs (the IDE reads
 * `.codeartsdoer/mcp/mcp_settings.json`). This target writes the CLI surface.
 *
 * @see https://support.huaweicloud.com/usermanual-cli/codeartsagent_cli_0019.html
 * @see https://support.huaweicloud.com/usermanual-cli/codeartsagent_cli_0031.html
 * @see https://support.huaweicloud.com/usermanual-cli/codeartsagent_cli_0010.html
 */
export const CODEARTS_CLI_DIR = ".codeartsdoer";

/**
 * Instructions are discovered by walking up from the working directory and
 * stopping at the first file that exists, so this is a single project-root
 * file rather than a rules directory.
 */
export const CODEARTS_CLI_RULE_FILE_NAME = "AGENTS.md";

/** Skills: `.codeartsdoer/skills/<name>/SKILL.md` in both scopes. */
export const CODEARTS_CLI_SKILLS_DIR_PATH = join(CODEARTS_CLI_DIR, "skills");

/** Custom commands: `.codeartsdoer/commands/<name>.md` in both scopes. */
export const CODEARTS_CLI_COMMANDS_DIR_PATH = join(CODEARTS_CLI_DIR, "commands");

/** Subagents: `.codeartsdoer/agents/<name>.md` in both scopes. */
export const CODEARTS_CLI_AGENTS_DIR_PATH = join(CODEARTS_CLI_DIR, "agents");

/**
 * MCP servers live in the CLI config file under the `mcp` key. The CLI also
 * accepts `codearts_cli.jsonc`; rulesync always writes the `.json` spelling so
 * a project never ends up with both files.
 */
export const CODEARTS_CLI_MCP_FILE_NAME = "codearts_cli.json";
