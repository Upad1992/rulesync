import { join } from "node:path";

import { z } from "zod/mini";

import { CODEARTS_CLI_AGENTS_DIR_PATH } from "../../constants/codearts-cli-paths.js";
import { RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH } from "../../constants/rulesync-paths.js";
import { AiFileParams, ValidationResult } from "../../types/ai-file.js";
import { formatError } from "../../utils/error.js";
import { readFileContent } from "../../utils/file.js";
import { parseFrontmatter, stringifyFrontmatter } from "../../utils/frontmatter.js";
import { RulesyncSubagent, RulesyncSubagentFrontmatter } from "./rulesync-subagent.js";
import {
  ToolSubagent,
  ToolSubagentForDeletionParams,
  ToolSubagentFromFileParams,
  ToolSubagentFromRulesyncSubagentParams,
  ToolSubagentSettablePaths,
} from "./tool-subagent.js";

// looseObject preserves unknown keys so a hand-written file round-trips.
// CodeArts moves unrecognized keys into its own `options` object instead of
// rejecting the file, so nothing here needs to be dropped on the way back in.
export const CodeartsCliSubagentFrontmatterSchema = z.looseObject({
  name: z.string(),
  description: z.string(),
  mode: z.optional(z.enum(["subagent", "primary", "all"])),
  // `provider/model`, e.g. `huaweicloud-maas/GLM-5.2`.
  model: z.optional(z.string()),
  // Tool-name map, e.g. `{"*": false, read: true}`.
  tools: z.optional(z.record(z.string(), z.boolean())),
});

export type CodeartsCliSubagentFrontmatter = z.infer<typeof CodeartsCliSubagentFrontmatterSchema>;

export type CodeartsCliSubagentParams = {
  frontmatter: CodeartsCliSubagentFrontmatter;
  body: string;
} & Omit<AiFileParams, "fileContent"> & { fileContent?: string };

/**
 * CodeArts CLI subagents.
 *
 * Each subagent is a Markdown file under `.codeartsdoer/agents/` (project) or
 * `~/.codeartsdoer/agents/` (user). `description` and `mode` are required by the
 * tool, `tools` is a tool-name map, and the Markdown body is the agent prompt.
 *
 * @see https://support.huaweicloud.com/usermanual-cli/codeartsagent_cli_0031.html
 */
export class CodeartsCliSubagent extends ToolSubagent {
  private readonly frontmatter: CodeartsCliSubagentFrontmatter;
  private readonly body: string;

  constructor({ frontmatter, body, fileContent, ...rest }: CodeartsCliSubagentParams) {
    if (rest.validate !== false) {
      const result = CodeartsCliSubagentFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`,
        );
      }
    }

    super({
      ...rest,
      fileContent: fileContent ?? stringifyFrontmatter(body, frontmatter),
    });

    this.frontmatter = frontmatter;
    this.body = body;
  }

  static getSettablePaths(_options: { global?: boolean } = {}): ToolSubagentSettablePaths {
    return { relativeDirPath: CODEARTS_CLI_AGENTS_DIR_PATH };
  }

  getFrontmatter(): CodeartsCliSubagentFrontmatter {
    return this.frontmatter;
  }

  getBody(): string {
    return this.body;
  }

  toRulesyncSubagent(): RulesyncSubagent {
    const { name, description, ...rest } = this.frontmatter;

    const rulesyncFrontmatter: RulesyncSubagentFrontmatter = {
      targets: ["*"],
      name,
      description,
      ...(Object.keys(rest).length > 0 && { "codearts-cli": rest }),
    };

    return new RulesyncSubagent({
      outputRoot: ".",
      frontmatter: rulesyncFrontmatter,
      body: this.body,
      relativeDirPath: RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH,
      relativeFilePath: this.getRelativeFilePath(),
      validate: true,
    });
  }

  static fromRulesyncSubagent({
    outputRoot = process.cwd(),
    rulesyncSubagent,
    validate = true,
    global = false,
    logger,
  }: ToolSubagentFromRulesyncSubagentParams): CodeartsCliSubagent {
    const rulesyncFrontmatter = rulesyncSubagent.getFrontmatter();
    const relativeFilePath = rulesyncSubagent.getRelativeFilePath();

    const rawDescription = rulesyncFrontmatter.description;
    const hasDescription = Boolean(rawDescription?.trim());
    if (!hasDescription) {
      logger?.warn(
        `CodeArts CLI requires a description on subagent "${relativeFilePath}"; falling back ` +
          `to the name "${rulesyncFrontmatter.name}". Add a description so automatic ` +
          `delegation can match the agent.`,
      );
    }
    const description = rawDescription?.trim() ? rawDescription : rulesyncFrontmatter.name;

    const section = rulesyncFrontmatter["codearts-cli"] ?? {};

    const frontmatter = {
      name: rulesyncFrontmatter.name,
      description,
      mode: "subagent",
      ...section,
    } as CodeartsCliSubagentFrontmatter;

    return new this({
      outputRoot,
      frontmatter,
      body: rulesyncSubagent.getBody(),
      relativeDirPath: this.getSettablePaths({ global }).relativeDirPath,
      relativeFilePath,
      validate,
      global,
    });
  }

  validate(): ValidationResult {
    const result = CodeartsCliSubagentFrontmatterSchema.safeParse(this.frontmatter);
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

  static isTargetedByRulesyncSubagent(rulesyncSubagent: RulesyncSubagent): boolean {
    return this.isTargetedByRulesyncSubagentDefault({
      rulesyncSubagent,
      toolTarget: "codearts-cli",
    });
  }

  static async fromFile({
    outputRoot = process.cwd(),
    relativeDirPath,
    relativeFilePath,
    validate = true,
    global = false,
  }: ToolSubagentFromFileParams): Promise<CodeartsCliSubagent> {
    const dirPath = relativeDirPath ?? this.getSettablePaths({ global }).relativeDirPath;
    const filePath = join(outputRoot, dirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body } = parseFrontmatter(fileContent, filePath);

    const result = CodeartsCliSubagentFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }

    return new CodeartsCliSubagent({
      outputRoot,
      relativeDirPath: dirPath,
      relativeFilePath,
      frontmatter: result.data,
      body: body.trim(),
      fileContent,
      validate,
    });
  }

  static forDeletion({
    outputRoot = process.cwd(),
    relativeDirPath,
    relativeFilePath,
    global = false,
  }: ToolSubagentForDeletionParams): CodeartsCliSubagent {
    return new this({
      outputRoot,
      relativeDirPath: relativeDirPath ?? this.getSettablePaths({ global }).relativeDirPath,
      relativeFilePath,
      frontmatter: { name: "", description: "" },
      body: "",
      fileContent: "",
      validate: false,
    });
  }
}
