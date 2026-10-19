import { join } from "node:path";

import {
  CODEARTS_CLI_DIR,
  CODEARTS_CLI_RULE_FILE_NAME,
} from "../../constants/codearts-cli-paths.js";
import { readFileContent } from "../../utils/file.js";
import { RulesyncRule } from "./rulesync-rule.js";
import {
  ToolRule,
  ToolRuleForDeletionParams,
  ToolRuleFromFileParams,
  ToolRuleFromRulesyncRuleParams,
  ToolRuleParams,
  ToolRuleSettablePaths,
  ToolRuleSettablePathsGlobal,
} from "./tool-rule.js";

export type CodeartsCliRuleParams = ToolRuleParams;

export type CodeartsCliRuleSettablePaths = Pick<ToolRuleSettablePaths, "root"> & {
  root: {
    relativeDirPath: string;
    relativeFilePath: string;
  };
  nonRoot?: undefined;
};

/**
 * Rule generator for CodeArts CLI.
 *
 * CodeArts CLI resolves instructions by walking up from the working directory
 * and stops at the first file it finds among `AGENTS.md`, `CLAUDE.md` and
 * `CONTEXT.md`; at user scope it reads `~/.codeartsdoer/AGENTS.md` first and
 * falls back to `~/.claude/CLAUDE.md`. There is no modular rules directory on
 * the CLI side (the `.codeartsdoer/rule/*.mdc` tree belongs to the IDE's
 * cloud rule center), so every non-root rule folds into the single root file.
 *
 * @see https://support.huaweicloud.com/usermanual-cli/codeartsagent_cli_0001.html
 */
export class CodeartsCliRule extends ToolRule {
  static getSettablePaths({
    global,
  }: {
    global?: boolean;
  } = {}): CodeartsCliRuleSettablePaths | ToolRuleSettablePathsGlobal {
    return {
      root: {
        relativeDirPath: global ? CODEARTS_CLI_DIR : ".",
        relativeFilePath: CODEARTS_CLI_RULE_FILE_NAME,
      },
    };
  }

  static async fromFile({
    outputRoot = process.cwd(),
    validate = true,
    global = false,
  }: ToolRuleFromFileParams): Promise<CodeartsCliRule> {
    const paths = this.getSettablePaths({ global });
    const fileContent = await readFileContent(
      join(outputRoot, paths.root.relativeDirPath, paths.root.relativeFilePath),
    );

    return new CodeartsCliRule({
      outputRoot,
      relativeDirPath: paths.root.relativeDirPath,
      relativeFilePath: paths.root.relativeFilePath,
      fileContent,
      validate,
      root: true,
    });
  }

  static fromRulesyncRule({
    outputRoot = process.cwd(),
    rulesyncRule,
    validate = true,
    global = false,
  }: ToolRuleFromRulesyncRuleParams): CodeartsCliRule {
    const paths = this.getSettablePaths({ global });
    const isRoot = rulesyncRule.getFrontmatter().root ?? false;

    return new CodeartsCliRule({
      outputRoot,
      relativeDirPath: paths.root.relativeDirPath,
      relativeFilePath: paths.root.relativeFilePath,
      fileContent: rulesyncRule.getBody(),
      validate,
      root: isRoot,
    });
  }

  toRulesyncRule(): RulesyncRule {
    return this.toRulesyncRuleDefault();
  }

  validate() {
    // CodeArts CLI reads plain Markdown without frontmatter requirements.
    return { success: true as const, error: null };
  }

  static forDeletion({
    outputRoot = process.cwd(),
    relativeDirPath,
    relativeFilePath,
    global = false,
  }: ToolRuleForDeletionParams): CodeartsCliRule {
    const paths = this.getSettablePaths({ global });
    const isRoot =
      relativeFilePath === paths.root.relativeFilePath &&
      (relativeDirPath === "." || relativeDirPath === paths.root.relativeDirPath);

    return new CodeartsCliRule({
      outputRoot,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false,
      root: isRoot,
    });
  }

  static isTargetedByRulesyncRule(rulesyncRule: RulesyncRule): boolean {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "codearts-cli",
    });
  }
}
