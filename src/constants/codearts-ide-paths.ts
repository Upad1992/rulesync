import { join } from "node:path";

import { CODEARTS_CLI_DIR } from "./codearts-cli-paths.js";

/**
 * CodeArts Agent IDE (Huawei's VS Code fork) shares `.codeartsdoer/` with the
 * CLI for rules, skills, commands and subagents, but reads MCP servers from a
 * separate file of its own.
 *
 * @see https://support.huaweicloud.com/usermanual-codeartsagent/codeartsagent_ug_0010.html
 */
export const CODEARTS_IDE_MCP_DIR_PATH = join(CODEARTS_CLI_DIR, "mcp");

/**
 * The IDE UI reads and writes the `mcpServers` block of this file. The
 * `codearts-cli` target owns `codearts_cli.json` instead, so the two targets
 * never write the same path.
 */
export const CODEARTS_IDE_MCP_FILE_NAME = "mcp_settings.json";
