import { join } from "node:path";

import {
  CODEARTS_CLI_DIR,
  CODEARTS_CLI_MCP_FILE_NAME,
} from "../../constants/codearts-cli-paths.js";
import { ValidationResult } from "../../types/ai-file.js";
import { McpServers } from "../../types/mcp.js";
import { formatError } from "../../utils/error.js";
import { readFileContent, readFileContentOrNull } from "../../utils/file.js";
import { isRecord } from "../../utils/type-guards.js";
import {
  declaresNoTransport,
  isRemoteMcpServer,
  resolveLocalMcpCommand,
  resolveRemoteMcpUrl,
  warnAndSkipMcpServer,
} from "./mcp-transport.js";
import { RulesyncMcp } from "./rulesync-mcp.js";
import {
  ToolMcp,
  ToolMcpForDeletionParams,
  ToolMcpFromFileParams,
  ToolMcpFromRulesyncMcpParams,
  ToolMcpParams,
  ToolMcpSettablePaths,
} from "./tool-mcp.js";

const TOOL_NAME = "CodeArts CLI";

/**
 * MCP generator for CodeArts CLI.
 *
 * Servers live in the CLI config file under `mcp`, using OpenCode's transport
 * names: `{type: "local", command: string[]}` for a spawned process and
 * `{type: "remote", url, headers}` for a network server. The CLI merges the
 * user-level file with the project-level one, project winning on name, and
 * ignores `.mcp.json`.
 *
 * rulesync owns the whole `mcp` object but leaves every other top-level key of
 * the file (`$schema`, `lsp`, `provider`, …) untouched.
 *
 * @see https://support.huaweicloud.com/usermanual-cli/codeartsagent_cli_0035.html
 */
export class CodeartsCliMcp extends ToolMcp {
  private readonly json: Record<string, unknown>;

  constructor(params: ToolMcpParams) {
    super(params);
    if (this.fileContent === undefined) {
      this.json = {};
      return;
    }
    try {
      this.json = JSON.parse(this.fileContent);
    } catch (error) {
      throw new Error(
        `Failed to parse CodeArts CLI MCP config at ${join(this.relativeDirPath, this.relativeFilePath)}: ${formatError(error)}`,
        { cause: error },
      );
    }
  }

  getJson(): Record<string, unknown> {
    return this.json;
  }

  /**
   * The file carries the CLI's own settings beside `mcp`, so it must never be
   * removed as an orphan.
   */
  override isDeletable(): boolean {
    return false;
  }

  static getSettablePaths(_options: { global?: boolean } = {}): ToolMcpSettablePaths {
    return {
      relativeDirPath: CODEARTS_CLI_DIR,
      relativeFilePath: CODEARTS_CLI_MCP_FILE_NAME,
    };
  }

  static async fromFile({
    outputRoot = process.cwd(),
    validate = true,
    global = false,
  }: ToolMcpFromFileParams): Promise<CodeartsCliMcp> {
    const paths = this.getSettablePaths({ global });
    const fileContent = await readFileContent(
      join(outputRoot, paths.relativeDirPath, paths.relativeFilePath),
    );

    return new CodeartsCliMcp({
      outputRoot,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent,
      validate,
      global,
    });
  }

  static async fromRulesyncMcp({
    outputRoot = process.cwd(),
    rulesyncMcp,
    validate = true,
    global = false,
    logger,
  }: ToolMcpFromRulesyncMcpParams): Promise<CodeartsCliMcp> {
    const paths = this.getSettablePaths({ global });

    const existingContent =
      (await readFileContentOrNull(
        join(outputRoot, paths.relativeDirPath, paths.relativeFilePath),
      )) ?? "{}";
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(existingContent);
    } catch (error) {
      throw new Error(
        `Failed to parse CodeArts CLI MCP config at ${join(paths.relativeDirPath, paths.relativeFilePath)}: ${formatError(error)}`,
        { cause: error },
      );
    }

    const mcpServers: Record<string, Record<string, unknown>> = {};
    for (const [serverName, config] of Object.entries(rulesyncMcp.getMcpServers())) {
      if (declaresNoTransport(config)) {
        warnAndSkipMcpServer({
          toolName: TOOL_NAME,
          serverName,
          reason: "no command or URL",
          logger,
        });
        continue;
      }

      if (isRemoteMcpServer(config)) {
        const url = resolveRemoteMcpUrl(config);
        if (!url) {
          warnAndSkipMcpServer({ toolName: TOOL_NAME, serverName, reason: "no URL", logger });
          continue;
        }
        mcpServers[serverName] = {
          type: "remote",
          url,
          ...(config.headers && { headers: config.headers }),
          ...(config.disabled === true && { enabled: false }),
        };
        continue;
      }

      const command = resolveLocalMcpCommand(config);
      if (command.length === 0) {
        warnAndSkipMcpServer({ toolName: TOOL_NAME, serverName, reason: "no command", logger });
        continue;
      }
      mcpServers[serverName] = {
        type: "local",
        command,
        ...(config.env && { environment: config.env }),
        ...(config.disabled === true && { enabled: false }),
      };
    }

    return new CodeartsCliMcp({
      outputRoot,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent: JSON.stringify({ ...json, mcp: mcpServers }, null, 2),
      validate,
      global,
    });
  }

  toRulesyncMcp(): RulesyncMcp {
    const mcp = isRecord(this.json.mcp) ? this.json.mcp : {};
    const mcpServers: McpServers = {};

    for (const [serverName, serverConfig] of Object.entries(mcp)) {
      if (!isRecord(serverConfig)) continue;

      if (serverConfig.type === "local" && Array.isArray(serverConfig.command)) {
        const [command, ...args] = serverConfig.command.filter(
          (entry): entry is string => typeof entry === "string",
        );
        if (command === undefined) continue;
        mcpServers[serverName] = {
          type: "stdio",
          command,
          ...(args.length > 0 && { args }),
          ...(isRecord(serverConfig.environment) && {
            env: serverConfig.environment as Record<string, string>,
          }),
          ...(serverConfig.enabled === false && { disabled: true }),
        };
        continue;
      }

      if (serverConfig.type === "remote" && typeof serverConfig.url === "string") {
        mcpServers[serverName] = {
          type: "http",
          url: serverConfig.url,
          ...(isRecord(serverConfig.headers) && {
            headers: serverConfig.headers as Record<string, string>,
          }),
          ...(serverConfig.enabled === false && { disabled: true }),
        };
      }
    }

    return this.toRulesyncMcpDefault({
      fileContent: JSON.stringify({ mcpServers }, null, 2),
    });
  }

  validate(): ValidationResult {
    return { success: true, error: null };
  }

  static forDeletion({
    outputRoot = process.cwd(),
    relativeDirPath,
    relativeFilePath,
    global = false,
  }: ToolMcpForDeletionParams): CodeartsCliMcp {
    return new CodeartsCliMcp({
      outputRoot,
      relativeDirPath,
      relativeFilePath,
      fileContent: "{}",
      validate: false,
      global,
    });
  }
}
