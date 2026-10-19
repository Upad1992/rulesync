import { join } from "node:path";

import { z } from "zod/mini";

import { RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH } from "../../constants/rulesync-paths.js";
import { AiFileParams, ValidationResult } from "../../types/ai-file.js";
import { formatError } from "../../utils/error.js";
import { readFileContent } from "../../utils/file.js";
import { parseFrontmatter, stringifyFrontmatter } from "../../utils/frontmatter.js";
import type { Logger } from "../../utils/logger.js";
import { getTraeAgentsDirPath } from "../../utils/trae.js";
import { RulesyncSubagent, RulesyncSubagentFrontmatter } from "./rulesync-subagent.js";
import {
  ToolSubagent,
  ToolSubagentForDeletionParams,
  ToolSubagentFromFileParams,
  ToolSubagentFromRulesyncSubagentParams,
  ToolSubagentSettablePaths,
} from "./tool-subagent.js";

// looseObject preserves unknown keys so a hand-written file round-trips
// through the canonical `trae:` section before generation filters it.
export const TraeSubagentFrontmatterSchema = z.looseObject({
  name: z.string(),
  description: z.string(),
  model: z.optional(z.string()),
  // Comma-separated. `""` disables every tool, so it must not be treated as
  // absent.
  tools: z.optional(z.string()),
  disallowedTools: z.optional(z.string()),
  mcpServers: z.optional(z.array(z.string())),
});

export type TraeSubagentFrontmatter = z.infer<typeof TraeSubagentFrontmatterSchema>;

export type TraeSubagentParams = {
  frontmatter: TraeSubagentFrontmatter;
  body: string;
} & Omit<AiFileParams, "fileContent"> & { fileContent?: string };

// Trae's documented name constraint:
// starts with a letter, letters/digits/`-` in the middle, ends with a letter
// or digit, at most 50 characters.
const TRAE_SUBAGENT_NAME_PATTERN = /^[A-Za-z](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/u;
const TRAE_SUBAGENT_NAME_MAX_LENGTH = 50;

const TRAE_SECTION_KEYS = ["model", "tools", "disallowedTools", "mcpServers"] as const;
type TraeSectionKey = (typeof TRAE_SECTION_KEYS)[number];
type TraeSection = Pick<TraeSubagentFrontmatter, TraeSectionKey>;

/**
 * Trae subagents.
 *
 * Each subagent is one Markdown file with YAML frontmatter under
 * `.trae/agents/` (project) or the user-level agents directory (global).
 * Trae and Trae CN share the project tree but use separate user roots, so the
 * global path resolves through `getTraeUserDir()` like skills and commands.
 *
 * Both published docs (trae.ai and trae.cn) spell the user-level path as
 * `~/.trae-cn/agents/`; the international `~/.trae/agents/` location is
 * inferred from the client's "peer product global directory" model rather
 * than documented. Keep the resolution in `getTraeUserDir()` so all Trae
 * features agree.
 *
 * @see https://docs.trae.ai/ide/subagents
 * @see https://docs.trae.cn/ide_subagents
 */
export class TraeSubagent extends ToolSubagent {
  private readonly frontmatter: TraeSubagentFrontmatter;
  private readonly body: string;

  constructor({ frontmatter, body, fileContent, ...rest }: TraeSubagentParams) {
    if (rest.validate !== false) {
      const result = TraeSubagentFrontmatterSchema.safeParse(frontmatter);
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

  static getSettablePaths(options: { global?: boolean } = {}): ToolSubagentSettablePaths {
    return {
      relativeDirPath: getTraeAgentsDirPath({ global: options.global === true }),
    };
  }

  getFrontmatter(): TraeSubagentFrontmatter {
    return this.frontmatter;
  }

  getBody(): string {
    return this.body;
  }

  toRulesyncSubagent(): RulesyncSubagent {
    const { name, description, ...rest } = this.frontmatter;

    const rulesyncFrontmatter: RulesyncSubagentFrontmatter = {
      targets: ["*"] as const,
      name,
      description,
      // Round-trip Trae's own fields (and any extra keys a hand-written file
      // carries) through the canonical `trae:` section. Unknown keys are
      // dropped with a warning when this source generates for Trae again.
      ...(Object.keys(rest).length > 0 && { trae: rest }),
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

  /**
   * Keep only the keys Trae understands and report the rest. Trae silently
   * ignores unknown YAML keys, so a warning is the only signal an author gets
   * for a `hooks:`/`permissionMode:` block copied from another target.
   */
  protected static sanitizeSection({
    section,
    relativeFilePath,
    logger,
  }: {
    section: Record<string, unknown>;
    relativeFilePath: string;
    logger?: Logger;
  }): TraeSection {
    const supportedKeys = new Set<string>(TRAE_SECTION_KEYS);
    const droppedKeys = Object.keys(section).filter((key) => !supportedKeys.has(key));
    if (droppedKeys.length > 0) {
      logger?.warn(
        `Dropping unsupported field(s) from the Trae subagent "${relativeFilePath}": ` +
          `${droppedKeys.join(", ")}. Trae only supports name, description, model, tools, ` +
          `disallowedTools, and mcpServers.`,
      );
    }

    const sanitized: Record<string, unknown> = {};
    for (const key of TRAE_SECTION_KEYS) {
      if (section[key] !== undefined) {
        sanitized[key] = section[key];
      }
    }
    return sanitized as TraeSection;
  }

  protected static warnAboutInvalidName({
    name,
    relativeFilePath,
    logger,
  }: {
    name: string;
    relativeFilePath: string;
    logger?: Logger;
  }): void {
    if (
      name.length > 0 &&
      name.length <= TRAE_SUBAGENT_NAME_MAX_LENGTH &&
      TRAE_SUBAGENT_NAME_PATTERN.test(name)
    ) {
      return;
    }

    logger?.warn(
      `Trae may reject the subagent in ${relativeFilePath}: the name "${name}" must start ` +
        `with a letter, contain only letters, digits, and "-", end with a letter or digit, ` +
        `and be at most ${TRAE_SUBAGENT_NAME_MAX_LENGTH} characters long.`,
    );
  }

  static fromRulesyncSubagent({
    outputRoot = process.cwd(),
    rulesyncSubagent,
    validate = true,
    global = false,
    logger,
  }: ToolSubagentFromRulesyncSubagentParams): ToolSubagent {
    const rulesyncFrontmatter = rulesyncSubagent.getFrontmatter();
    const relativeFilePath = rulesyncSubagent.getRelativeFilePath();

    const rawDescription = rulesyncFrontmatter.description;
    const hasDescription = Boolean(rawDescription?.trim());
    if (!hasDescription) {
      logger?.warn(
        `Trae requires a description on subagent "${relativeFilePath}"; falling back to ` +
          `the name "${rulesyncFrontmatter.name}". Add a description so Trae's automatic ` +
          `delegation can match the agent.`,
      );
    }
    const description = rawDescription?.trim() ? rawDescription : rulesyncFrontmatter.name;

    const traeSection = this.sanitizeSection({
      section: rulesyncFrontmatter.trae ?? {},
      relativeFilePath,
      logger,
    });

    const traeFrontmatter: TraeSubagentFrontmatter = {
      name: rulesyncFrontmatter.name,
      description,
      ...traeSection,
    };

    this.warnAboutInvalidName({
      name: traeFrontmatter.name,
      relativeFilePath,
      logger,
    });

    const body = rulesyncSubagent.getBody();
    const fileContent = stringifyFrontmatter(body, traeFrontmatter);
    const paths = this.getSettablePaths({ global });

    return new TraeSubagent({
      outputRoot,
      frontmatter: traeFrontmatter,
      body,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath,
      fileContent,
      validate,
    });
  }

  validate(): ValidationResult {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }

    const result = TraeSubagentFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`,
        ),
      };
    }
  }

  static isTargetedByRulesyncSubagent(rulesyncSubagent: RulesyncSubagent): boolean {
    return this.isTargetedByRulesyncSubagentDefault({
      rulesyncSubagent,
      toolTarget: "trae",
    });
  }

  static async fromFile({
    outputRoot = process.cwd(),
    relativeDirPath,
    relativeFilePath,
    validate = true,
    global = false,
  }: ToolSubagentFromFileParams): Promise<TraeSubagent> {
    const dirPath = relativeDirPath ?? this.getSettablePaths({ global }).relativeDirPath;
    const filePath = join(outputRoot, dirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent, filePath);

    const result = TraeSubagentFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }

    return new TraeSubagent({
      outputRoot,
      relativeDirPath: dirPath,
      relativeFilePath,
      frontmatter: result.data,
      body: content.trim(),
      fileContent,
      validate,
    });
  }

  static forDeletion({
    outputRoot = process.cwd(),
    relativeDirPath,
    relativeFilePath,
  }: ToolSubagentForDeletionParams): TraeSubagent {
    return new TraeSubagent({
      outputRoot,
      relativeDirPath,
      relativeFilePath,
      frontmatter: { name: "", description: "" },
      body: "",
      fileContent: "",
      validate: false,
    });
  }
}
