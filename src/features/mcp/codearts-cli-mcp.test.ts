import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CODEARTS_CLI_DIR,
  CODEARTS_CLI_MCP_FILE_NAME,
} from "../../constants/codearts-cli-paths.js";
import { RULESYNC_RELATIVE_DIR_PATH } from "../../constants/rulesync-paths.js";
import { setupTestDirectory } from "../../test-utils/test-directories.js";
import { writeFileContent } from "../../utils/file.js";
import { CodeartsCliMcp } from "./codearts-cli-mcp.js";
import { RulesyncMcp } from "./rulesync-mcp.js";

describe("CodeartsCliMcp", () => {
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

  it("should resolve codearts_cli.json in both scopes", () => {
    expect(CodeartsCliMcp.getSettablePaths()).toEqual({
      relativeDirPath: CODEARTS_CLI_DIR,
      relativeFilePath: CODEARTS_CLI_MCP_FILE_NAME,
    });
    expect(CodeartsCliMcp.getSettablePaths({ global: true })).toEqual({
      relativeDirPath: CODEARTS_CLI_DIR,
      relativeFilePath: CODEARTS_CLI_MCP_FILE_NAME,
    });
  });

  it("should write local and remote servers under mcp and preserve other settings", async () => {
    await writeFileContent(
      join(testDir, CODEARTS_CLI_DIR, CODEARTS_CLI_MCP_FILE_NAME),
      JSON.stringify({ $schema: "https://opencode.ai/config.json", lsp: false }),
    );

    const mcp = await CodeartsCliMcp.fromRulesyncMcp({
      outputRoot: testDir,
      rulesyncMcp: buildRulesyncMcp({
        local: {
          type: "stdio",
          command: "node",
          args: ["server.js"],
          env: { API_KEY: "value" },
        },
        remote: {
          type: "http",
          url: "https://example.com/mcp",
          headers: { Authorization: "Bearer x" },
        },
        disabled: { command: "old", disabled: true },
      }),
    });

    expect(mcp.getJson()).toEqual({
      $schema: "https://opencode.ai/config.json",
      lsp: false,
      mcp: {
        local: {
          type: "local",
          command: ["node", "server.js"],
          environment: { API_KEY: "value" },
        },
        remote: {
          type: "remote",
          url: "https://example.com/mcp",
          headers: { Authorization: "Bearer x" },
        },
        disabled: {
          type: "local",
          command: ["old"],
          enabled: false,
        },
      },
    });
  });

  it("should import local and remote servers back to the canonical shape", () => {
    const mcp = new CodeartsCliMcp({
      relativeDirPath: CODEARTS_CLI_DIR,
      relativeFilePath: CODEARTS_CLI_MCP_FILE_NAME,
      fileContent: JSON.stringify({
        mcp: {
          local: {
            type: "local",
            command: ["node", "server.js"],
            environment: { API_KEY: "value" },
          },
          remote: {
            type: "remote",
            url: "https://example.com/mcp",
            headers: { Authorization: "Bearer x" },
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
      },
      remote: {
        type: "http",
        url: "https://example.com/mcp",
        headers: { Authorization: "Bearer x" },
      },
    });
  });

  it("should never be deleted as an orphan because the file holds other settings", () => {
    const mcp = new CodeartsCliMcp({
      relativeDirPath: CODEARTS_CLI_DIR,
      relativeFilePath: CODEARTS_CLI_MCP_FILE_NAME,
      fileContent: "{}",
      validate: false,
    });

    expect(mcp.isDeletable()).toBe(false);
  });
});
