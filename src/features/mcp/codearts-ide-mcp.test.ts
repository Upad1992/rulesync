import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CODEARTS_IDE_MCP_DIR_PATH,
  CODEARTS_IDE_MCP_FILE_NAME,
} from "../../constants/codearts-ide-paths.js";
import { RULESYNC_RELATIVE_DIR_PATH } from "../../constants/rulesync-paths.js";
import { setupTestDirectory } from "../../test-utils/test-directories.js";
import { writeFileContent } from "../../utils/file.js";
import { CodeartsIdeMcp } from "./codearts-ide-mcp.js";
import { RulesyncMcp } from "./rulesync-mcp.js";

describe("CodeartsIdeMcp", () => {
  let testDir: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ testDir, cleanup } = await setupTestDirectory());
    vi.spyOn(process, "cwd").mockReturnValue(testDir);
  });

  afterEach(async () => {
    await cleanup();
    vi.restoreAllMocks();
  });

  const buildRulesyncMcp = (mcpServers: Record<string, unknown>) =>
    new RulesyncMcp({
      relativeDirPath: RULESYNC_RELATIVE_DIR_PATH,
      relativeFilePath: "mcp.json",
      fileContent: JSON.stringify({ mcpServers }),
    });

  it("should resolve mcp_settings.json in the project scope", () => {
    expect(CodeartsIdeMcp.getSettablePaths()).toEqual({
      relativeDirPath: CODEARTS_IDE_MCP_DIR_PATH,
      relativeFilePath: CODEARTS_IDE_MCP_FILE_NAME,
    });
  });

  it("should write local and remote servers under mcpServers and preserve other keys", async () => {
    await writeFileContent(
      join(testDir, CODEARTS_IDE_MCP_DIR_PATH, CODEARTS_IDE_MCP_FILE_NAME),
      JSON.stringify({
        autoApprove: { "test-server": ["read"] },
        mcpServers: { stale: { command: "old" } },
      }),
    );

    const mcp = await CodeartsIdeMcp.fromRulesyncMcp({
      outputRoot: testDir,
      rulesyncMcp: buildRulesyncMcp({
        local: {
          type: "stdio",
          command: "node",
          args: ["server.js"],
          env: { API_KEY: "value" },
          timeout: 30000,
        },
        remote: {
          type: "http",
          url: "https://example.com/mcp",
          headers: { Authorization: "Bearer x" },
        },
        sse: { type: "sse", url: "https://example.com/mcp/sse" },
        disabled: { command: "old", disabled: true },
      }),
    });

    expect(mcp.getJson()).toEqual({
      autoApprove: { "test-server": ["read"] },
      mcpServers: {
        local: {
          command: "node",
          args: ["server.js"],
          env: { API_KEY: "value" },
          timeout: 30000,
        },
        remote: {
          url: "https://example.com/mcp",
          headers: { Authorization: "Bearer x" },
          type: "streamableHttp",
        },
        sse: {
          url: "https://example.com/mcp/sse",
          type: "sse",
        },
        disabled: {
          command: "old",
          disabled: true,
        },
      },
    });
  });

  it("should import the mcpServers shape the IDE UI writes", () => {
    const mcp = new CodeartsIdeMcp({
      relativeDirPath: CODEARTS_IDE_MCP_DIR_PATH,
      relativeFilePath: CODEARTS_IDE_MCP_FILE_NAME,
      fileContent: JSON.stringify({
        mcpServers: {
          local: {
            command: "node",
            args: ["server.js"],
            env: { API_KEY: "value" },
            disabled: true,
          },
          remote: {
            url: "https://example.com/mcp/sse",
            headers: { Authorization: "Bearer x" },
            type: "sse",
          },
        },
      }),
    });

    expect(mcp.toRulesyncMcp().getMcpServers()).toEqual({
      local: {
        type: "stdio",
        command: "node",
        args: ["server.js"],
        env: { API_KEY: "value" },
        disabled: true,
      },
      remote: {
        type: "sse",
        url: "https://example.com/mcp/sse",
        headers: { Authorization: "Bearer x" },
      },
    });
  });

  it("should import the kernel mcp shape after the IDE rewrites the file", () => {
    const mcp = new CodeartsIdeMcp({
      relativeDirPath: CODEARTS_IDE_MCP_DIR_PATH,
      relativeFilePath: CODEARTS_IDE_MCP_FILE_NAME,
      fileContent: JSON.stringify({
        mcp: {
          local: {
            type: "local",
            command: ["node", "server.js"],
            environment: { API_KEY: "value" },
            enabled: false,
          },
          remote: {
            type: "remote",
            url: "https://example.com/mcp",
          },
        },
      }),
    });

    expect(mcp.toRulesyncMcp().getMcpServers()).toEqual({
      local: {
        type: "stdio",
        command: "node",
        args: ["server.js"],
        env: { API_KEY: "value" },
        disabled: true,
      },
      remote: {
        type: "http",
        url: "https://example.com/mcp",
      },
    });
  });

  it("should never be deleted as an orphan because the IDE stores autoApprove beside mcpServers", () => {
    const mcp = new CodeartsIdeMcp({
      relativeDirPath: CODEARTS_IDE_MCP_DIR_PATH,
      relativeFilePath: CODEARTS_IDE_MCP_FILE_NAME,
      fileContent: "{}",
      validate: false,
    });

    expect(mcp.isDeletable()).toBe(false);
  });
});
