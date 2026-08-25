import { Err, Ok, type Result } from '@/core/result';
import { LanguageFileFormat } from '@labeleer/translation-dataset-transformers';

type ProjectConfigBase<T extends LanguageFileFormat> = {
  type: T;
  basePath: string;
  labelFiles: [string, ...string[]];
};

export type JsonProjectConfig = ProjectConfigBase<LanguageFileFormat.JSON>;
export type YamlProjectConfig = ProjectConfigBase<LanguageFileFormat.YAML>;
export type TsProjectConfig = ProjectConfigBase<LanguageFileFormat.TS>;
export type PoProjectConfig = ProjectConfigBase<LanguageFileFormat.PO>;
export type AppleStringsProjectConfig =
  ProjectConfigBase<LanguageFileFormat.APPLE_STRINGS>;
export type AndroidStringsProjectConfig =
  ProjectConfigBase<LanguageFileFormat.ANDROID_STRINGS>;
export type XCStringsProjectConfig =
  ProjectConfigBase<LanguageFileFormat.XCSTRINGS>;

export type XLIFFProjectConfig = ProjectConfigBase<LanguageFileFormat.XLIFF>;

export type ProjectConfig =
  | JsonProjectConfig
  | AppleStringsProjectConfig
  | AndroidStringsProjectConfig
  | XLIFFProjectConfig
  | TsProjectConfig
  | PoProjectConfig
  | YamlProjectConfig
  | XCStringsProjectConfig;

export interface ProjectIdentity {
  type: LanguageFileFormat;
  projectId: string;
  basePath: string;
}

const projectIdentityPattern = new RegExp(
  `^(\w+)::(${Object.values(LanguageFileFormat).join('|')})@(.*)$`
);

export function extractProjectIdentity(
  input: string | undefined
): Result<ProjectIdentity> {
  const matches = input?.match(projectIdentityPattern);
  if (!matches) {
    return Err(
      'Invalid project identity. Expected format is "<projectId>::<projectType>@<label file base path>"'
    );
  }

  const [, projectId, fmt, basePath] = matches;

  return Ok({
    type: fmt as LanguageFileFormat,
    projectId,
    basePath,
  });
}

export function extractProjectConfigFromEnv(): Result<ProjectConfig> {
  const identity = extractProjectIdentity(process.env.LABELEER_PROJECT);

  if (!identity.ok) return identity;
  const config = identity.value;

  return configLookupMap[config.type]?.(config) ?? Err('Not supported');
}

type LookupFn = (identity: ProjectIdentity) => Result<ProjectConfig>;

const configLookupMap: Partial<Record<LanguageFileFormat, LookupFn>> = {
  [LanguageFileFormat.JSON]: resolveJsonProjectConfig,
  [LanguageFileFormat.XCSTRINGS]: resolveXCStringsProjectConfig,
  [LanguageFileFormat.YAML]: resolveYamlProjectConfig,
};

function resolveJsonProjectConfig(
  identity: ProjectIdentity
): Result<JsonProjectConfig>;

function resolveXCStringsProjectConfig(
  identity: ProjectIdentity
): Result<XCStringsProjectConfig>;

function resolveYamlProjectConfig(
  identity: ProjectIdentity
): Result<YamlProjectConfig>;

const resolvePOProjectConfig: LookupFn = (
  identity
): Result<PoProjectConfig> => {};
