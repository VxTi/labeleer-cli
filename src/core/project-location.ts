import { Err, Ok, type Result } from '@/core/result';
import { SupportedFormat } from '@labeleer/translation-dataset-transformers';

type ProjectConfigBase<T extends SupportedFormat> = {
  type: T;
  basePath: string;
  labelFiles: [string, ...string[]];
};

export type JsonProjectConfig = ProjectConfigBase<SupportedFormat.JSON>;
export type YamlProjectConfig = ProjectConfigBase<SupportedFormat.YAML>;
export type TsProjectConfig = ProjectConfigBase<SupportedFormat.TS>;
export type PoProjectConfig = ProjectConfigBase<SupportedFormat.PO>;
export type AppleStringsProjectConfig =
  ProjectConfigBase<SupportedFormat.APPLE_STRINGS>;
export type AndroidStringsProjectConfig =
  ProjectConfigBase<SupportedFormat.ANDROID_STRINGS>;
export type XCStringsProjectConfig =
  ProjectConfigBase<SupportedFormat.XCSTRINGS>;

export type XLIFFProjectConfig = ProjectConfigBase<SupportedFormat.XLIFF>;

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
  type: SupportedFormat;
  projectId: string;
  basePath: string;
}

const projectIdentityPattern = new RegExp(
  `^(\w+)::(${Object.values(SupportedFormat).join('|')})@(.*)$`
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
    type: fmt as SupportedFormat,
    projectId,
    basePath,
  });
}

export function extractProjectConfigFromEnv(): Result<ProjectConfig> {
  const identity = extractProjectIdentity(process.env.LABELEER_PROJECT);

  if (!identity.success) return identity;
  const config = identity.value;

  return configLookupMap[config.type]?.(config) ?? Err('Not supported');
}

type LookupFn = (identity: ProjectIdentity) => Result<ProjectConfig>;

const configLookupMap: Partial<Record<SupportedFormat, LookupFn>> = {
  [SupportedFormat.JSON]: resolveJsonProjectConfig,
  [SupportedFormat.XCSTRINGS]: resolveXCStringsProjectConfig,
  [SupportedFormat.YAML]: resolveYamlProjectConfig,
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
