import { join } from "node:path";

import { z } from "zod/mini";

import { CODEARTS_CLI_COMMANDS_DIR_PATH } from "../../constants/codearts-cli-paths.js";
import { AiFileParams, ValidationResult } from "../../types/ai-file.js";
import { formatError } from "../../utils/error.js";
import { readFileContent } from "../../utils/file.js";
import { parseFrontmatter, stringifyFrontmatter } from "../../utils/frontmatter.js";
import { RulesyncCommand, RulesyncCommandFrontmatter } from "./rulesync-command.js";
import {
  ToolCommand,
  ToolCommandForDeletionParams,
  ToolCommandFromFileParams,
  ToolCommandFromRulesyncCommandParams,
  ToolCommandSettablePaths,
} from "./tool-command.js";

// looseObject preserves unknown keys so a hand-written file round-trips.
export const CodeartsCliCommandFrontmatterSchema = z.looseObject({
  // Shown next to the command in the `/` menu.
  description: z.optional(z.string()),
  // Name of the agent the command runs as.
  agent: z.optional(z.string()),
  // Model override for this command.
  model: z.optional(z.string()),
  // Run the command as a subagent task instead of in the main session.
  subtask: z.optional(z.boolean()),
});

export type CodeartsCliCommandFrontmatter = z.infer<typeof CodeartsCliCommandFrontmatterSchema>;

export type CodeartsCliCommandParams = {
  frontmatter: CodeartsCliCommandFrontmatter;
  body: string;
} & Omit<AiFileParams, "fileContent">;

/**
 * Custom command for CodeArts CLI.
 *
 * Commands are Markdown files under `.codeartsdoer/commands/` (project) and
 * `~/.codeartsdoer/commands/` (user). The command name comes from the file path
 * (nested directories become `/a/b`), the body is the prompt template, and the
 * frontmatter accepts only `description`, `agent`, `model` and `subtask`.
 *
 * @see https://support.huaweicloud.com/usermanual-cli/codeartsagent_cli_0010.html
 */
export class CodeartsCliCommand extends ToolCommand {
  private readonly frontmatter: CodeartsCliCommandFrontmatter;
  private readonly body: string;

  constructor({ frontmatter, body, ...rest }: CodeartsCliCommandParams) {
    if (rest.validate) {
      const result = CodeartsCliCommandFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`,
        );
      }
    }

    super({
      ...rest,
      fileContent: stringifyFrontmatter(body, frontmatter),
    });

    this.frontmatter = frontmatter;
    this.body = body;
  }

  static getSettablePaths(_options: { global?: boolean } = {}): ToolCommandSettablePaths {
    return { relativeDirPath: CODEARTS_CLI_COMMANDS_DIR_PATH };
  }

  getBody(): string {
    return this.body;
  }

  getFrontmatter(): Record<string, unknown> {
    return this.frontmatter;
  }

  toRulesyncCommand(): RulesyncCommand {
    const { description, ...otherFields } = this.frontmatter;

    const rulesyncFrontmatter: RulesyncCommandFrontmatter = {
      targets: ["*"],
      description,
      ...(Object.keys(otherFields).length > 0 && { "codearts-cli": otherFields }),
    };

    return new RulesyncCommand({
      outputRoot: ".",
      frontmatter: rulesyncFrontmatter,
      body: this.body,
      relativeDirPath: RulesyncCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: this.relativeFilePath,
      fileContent: stringifyFrontmatter(this.body, rulesyncFrontmatter),
      validate: true,
    });
  }

  static fromRulesyncCommand({
    outputRoot = process.cwd(),
    rulesyncCommand,
    validate = true,
    global = false,
  }: ToolCommandFromRulesyncCommandParams): CodeartsCliCommand {
    const rulesyncFrontmatter = rulesyncCommand.getFrontmatter();
    const section = rulesyncFrontmatter["codearts-cli"] ?? {};

    const frontmatter = {
      description: rulesyncFrontmatter.description,
      ...section,
    } as CodeartsCliCommandFrontmatter;

    return new CodeartsCliCommand({
      outputRoot,
      frontmatter,
      body: rulesyncCommand.getBody(),
      relativeDirPath: this.getSettablePaths({ global }).relativeDirPath,
      relativeFilePath: rulesyncCommand.getRelativeFilePath(),
      validate,
    });
  }

  validate(): ValidationResult {
    const result = CodeartsCliCommandFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    }
    return {
      success: false,
      error: new Error(
        `Invalid frontmatter in ${join(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`,
      ),
    };
  }

  static isTargetedByRulesyncCommand(rulesyncCommand: RulesyncCommand): boolean {
    return this.isTargetedByRulesyncCommandDefault({
      rulesyncCommand,
      toolTarget: "codearts-cli",
    });
  }

  static async fromFile({
    outputRoot = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false,
  }: ToolCommandFromFileParams): Promise<CodeartsCliCommand> {
    const paths = this.getSettablePaths({ global });
    const filePath = join(outputRoot, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body } = parseFrontmatter(fileContent, filePath);

    return new CodeartsCliCommand({
      outputRoot,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath,
      frontmatter,
      body: body.trim(),
      validate,
    });
  }

  static forDeletion({
    outputRoot = process.cwd(),
    relativeDirPath,
    relativeFilePath,
    global = false,
  }: ToolCommandForDeletionParams): CodeartsCliCommand {
    return new CodeartsCliCommand({
      outputRoot,
      relativeDirPath: relativeDirPath ?? this.getSettablePaths({ global }).relativeDirPath,
      relativeFilePath,
      frontmatter: {},
      body: "",
      validate: false,
    });
  }
}
