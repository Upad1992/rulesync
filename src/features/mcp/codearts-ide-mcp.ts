import { join } from "node:path";

import {
  CODEARTS_IDE_MCP_DIR_PATH,
  CODEARTS_IDE_MCP_FILE_NAME,
} from "../../constants/codearts-ide-paths.js";
import { ValidationResult } from "../../types/ai-file.js";
import { McpServer, McpServers } from "../../types/mcp.js";
import { formatError } from "../../utils/error.js";
import { readFileContentOrNull } from "../../utils/file.js";
import type { Logger } from "../../utils/logger.js";
import { isPlainObject } from "../../utils/type-guards.js";
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

const TOOL_NAME = "CodeArts Agent IDE";

/**
 * MCP generator for the CodeArts Agent IDE.
 *
 * The IDE UI reads and writes the `mcpServers` block of
 * `.codeartsdoer/mcp/mcp_settings.json`. Entries use the Cline-like shape the
 * UI itself produces: `{command: string, args: string[], env, disabled,
 * timeout}` for spawned servers and `{url, headers, type, disabled, timeout}`
 * for network servers. `type` is `sse` or `streamableHttp`.
 *
 * The kernel also accepts a newer `{mcp: {name: {type: "local" | "remote",
 * command: string[], environment, enabled}}}` shape, so imports read either
 * key. Generation always writes `mcpServers`, which is what the UI edits.
 *
 * Only the project scope is generated: the IDE documents this file at the
 * project root, and its "personal" MCP path is hard-coded to
 * `~/.config/opencode/`, which belongs to another tool.
 *
 * @see https://support.huaweicloud.com/usermanual-codeartsagent/codeartsagent_ug_0010.html
 */
export class CodeartsIdeMcp extends ToolMcp {
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
        `Failed to parse CodeArts Agent IDE MCP config at ${join(this.relativeDirPath, this.relativeFilePath)}: ${formatError(error)}`,
        { cause: error },
      );
    }
  }

  getJson(): Record<string, unknown> {
    return this.json;
  }

  /**
   * The IDE UI stores `autoApprove` and may add other keys beside
   * `mcpServers`, so the file is never removed as an orphan.
   */
  override isDeletable(): boolean {
    return false;
  }

  static getSettablePaths(_options: { global?: boolean } = {}): ToolMcpSettablePaths {
    return {
      relativeDirPath: CODEARTS_IDE_MCP_DIR_PATH,
      relativeFilePath: CODEARTS_IDE_MCP_FILE_NAME,
    };
  }

  static async fromFile({
    outputRoot = process.cwd(),
    validate = true,
    global = false,
  }: ToolMcpFromFileParams): Promise<CodeartsIdeMcp> {
    const paths = this.getSettablePaths({ global });
    const fileContent = await readFileContentOrNull(
      join(outputRoot, paths.relativeDirPath, paths.relativeFilePath),
    );

    return new CodeartsIdeMcp({
      outputRoot,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent: fileContent ?? JSON.stringify({ mcpServers: {} }, null, 2),
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
  }: ToolMcpFromRulesyncMcpParams): Promise<CodeartsIdeMcp> {
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
        `Failed to parse CodeArts Agent IDE MCP config at ${join(paths.relativeDirPath, paths.relativeFilePath)}: ${formatError(error)}`,
        { cause: error },
      );
    }
    if (!isPlainObject(json)) {
      throw new Error(
        `Failed to parse CodeArts Agent IDE MCP config at ${join(paths.relativeDirPath, paths.relativeFilePath)}: expected a JSON object`,
      );
    }

    const mcpServers: Record<string, Record<string, unknown>> = {};
    for (const [serverName, config] of Object.entries(rulesyncMcp.getMcpServers())) {
      const server = toIdeServer({ serverName, config, logger });
      if (server) {
        mcpServers[serverName] = server;
      }
    }

    return new CodeartsIdeMcp({
      outputRoot,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent: JSON.stringify({ ...json, mcpServers }, null, 2),
      validate,
      global,
    });
  }

  toRulesyncMcp(): RulesyncMcp {
    const legacy = isPlainObject(this.json.mcpServers) ? this.json.mcpServers : undefined;
    const modern = isPlainObject(this.json.mcp) ? this.json.mcp : undefined;
    const entries = legacy && Object.keys(legacy).length > 0 ? legacy : (modern ?? {});
    const mcpServers: McpServers = {};

    for (const [serverName, rawConfig] of Object.entries(entries)) {
      if (!isPlainObject(rawConfig)) continue;
      const serverConfig = parseIdeServer(rawConfig);
      if (serverConfig) {
        mcpServers[serverName] = serverConfig;
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
  }: ToolMcpForDeletionParams): CodeartsIdeMcp {
    return new CodeartsIdeMcp({
      outputRoot,
      relativeDirPath,
      relativeFilePath,
      fileContent: JSON.stringify({ mcpServers: {} }, null, 2),
      validate: false,
      global,
    });
  }
}

/** One canonical server in the shape the IDE UI reads, or `null` to skip it. */
function toIdeServer({
  serverName,
  config,
  logger,
}: {
  serverName: string;
  config: McpServer;
  logger?: Logger;
}): Record<string, unknown> | null {
  if (declaresNoTransport(config)) {
    warnAndSkipMcpServer({
      toolName: TOOL_NAME,
      serverName,
      reason: "no command or URL",
      logger,
    });
    return null;
  }

  if (isRemoteMcpServer(config)) {
    if ((config.transport ?? config.type) === "ws") {
      warnAndSkipMcpServer({
        toolName: TOOL_NAME,
        serverName,
        reason: "a WebSocket transport, which the IDE cannot read",
        logger,
      });
      return null;
    }
    const url = resolveRemoteMcpUrl(config);
    if (!url) {
      warnAndSkipMcpServer({ toolName: TOOL_NAME, serverName, reason: "no URL", logger });
      return null;
    }
    return {
      url,
      ...(config.headers && { headers: config.headers }),
      type: remoteTransportType(config, url),
      ...(config.disabled === true && { disabled: true }),
      ...(config.timeout !== undefined && { timeout: config.timeout }),
    };
  }

  const command = resolveLocalMcpCommand(config);
  if (command.length === 0) {
    warnAndSkipMcpServer({ toolName: TOOL_NAME, serverName, reason: "no command", logger });
    return null;
  }
  const [program, ...args] = command;
  return {
    command: program,
    ...(args.length > 0 && { args }),
    ...(config.env && { env: config.env }),
    ...(config.disabled === true && { disabled: true }),
    ...(config.timeout !== undefined && { timeout: config.timeout }),
  };
}

/** The IDE's own conversion: `/sse` and `/stream` URLs are SSE, the rest HTTP. */
function remoteTransportType(config: McpServer, url: string): "sse" | "streamableHttp" {
  if ((config.type ?? config.transport) === "sse") {
    return "sse";
  }
  return url.includes("/sse") || url.includes("/stream") ? "sse" : "streamableHttp";
}

/**
 * Read one entry from either shape the IDE accepts: the UI's `mcpServers`
 * (command string + args, `disabled`) or the kernel's `mcp` (command array,
 * `environment`, `enabled`).
 */
function parseIdeServer(entry: Record<string, unknown>): McpServer | undefined {
  const url = entry.url;
  if (typeof url === "string") {
    return {
      type: entry.type === "sse" ? "sse" : "http",
      url,
      ...(isPlainObject(entry.headers) && {
        headers: entry.headers as Record<string, string>,
      }),
      ...(isDisabled(entry) && { disabled: true }),
    };
  }

  const command = entry.command;
  if (typeof command !== "string" && !Array.isArray(command)) {
    return undefined;
  }
  const [program, ...rest] = Array.isArray(command) ? command : [command];
  if (typeof program !== "string" || program.length === 0) {
    return undefined;
  }
  const args = [...rest, ...(Array.isArray(entry.args) ? entry.args : [])].filter(
    (arg): arg is string => typeof arg === "string",
  );
  const env = isPlainObject(entry.env)
    ? entry.env
    : isPlainObject(entry.environment)
      ? entry.environment
      : undefined;

  return {
    type: "stdio",
    command: program,
    ...(args.length > 0 && { args }),
    ...(env && { env: env as Record<string, string> }),
    ...(isDisabled(entry) && { disabled: true }),
  };
}

function isDisabled(entry: Record<string, unknown>): boolean {
  return entry.disabled === true || entry.enabled === false;
}
