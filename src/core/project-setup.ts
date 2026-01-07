import { Err, Ok, type Result } from '@/core/result';
import { getFileNameForFormat } from '@/formatting';
import { theme } from '@/utils';
import { select } from '@inquirer/prompts';
import {
  getFileExtensionsFromFormat,
  SupportedFormat,
  Locales,
  isBCP47Locale,
  isISO639_1LanguageCode,
  isLocale,
  iso639_1ToLocale,
  toPOSIX,
} from '@labeleer/translation-dataset-transformers';
import { readFile, stat, writeFile } from 'fs/promises';
import { glob, type GlobOptionsWithFileTypesUnset } from 'glob';
import { join } from 'path';
import { z } from 'zod';

const PROJECT_FILE_NAME = 'labeleer.json';
const GLOB_IGNORE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  '.tmp',
  '.gradle',
  'DerivedData',
  'Pods',
  'xcuserdata',
  '.git',
  '.idea',
  'reports',
  '__tests__',
];

export const LocaleDecoder = z
  .string()
  .transform(val =>
    isISO639_1LanguageCode(val)
      ? iso639_1ToLocale(val)
      : isLocale(val)
        ? val
        : isBCP47Locale(val)
          ? toPOSIX(val)
          : undefined
  )
  .refine(val => !!val, {
    message: 'Invalid locale format',
  });

const ProjectSetupDecoder = z.object({
  variant: z.enum(SupportedFormat),
  paths: z
    .array(
      z.object({
        locale: z.enum([...Locales, '*']),
        path: z.string(),
      })
    )
    .min(1),
});

export type ProjectSetup = z.infer<typeof ProjectSetupDecoder> & {};
export type ProjectPathEntry = ProjectSetup['paths'][number] & {};

export async function getProjectSetup(): Promise<Result<ProjectSetup>> {
  if (!(await hasProjectSetupFile())) {
    return Err('Project configuration file not found');
  }

  const rawContent = await readFile(getProjectConfigFilePath(), 'utf-8');
  const parseResult = await ProjectSetupDecoder.safeParseAsync(
    JSON.parse(rawContent)
  );

  if (!parseResult.success) return Err(parseResult.error.message);

  return Ok(parseResult.data);
}

export async function createProjectSetup(
  variant: SupportedFormat,
  paths: ProjectPathEntry[]
): Promise<Result<ProjectSetup>> {
  if (await hasProjectSetupFile()) {
    return getProjectSetup();
  }
  if (paths.length === 0) {
    return Err('Project configuration file not found');
  }

  const setup: ProjectSetup = {
    variant,
    paths,
  };

  await writeFile(getProjectConfigFilePath(), JSON.stringify(setup));

  return Ok(setup);
}

export async function tryInquireProjectSetup(): Promise<
  Result<ProjectSetup | undefined>
> {
  const setup = await getProjectSetup();

  if (setup.success) return setup;

  const shouldCreateSetupFile = await select({
    message: 'No project setup found. Would you like to create one?',
    choices: [
      {
        name: 'Yes',
        value: true,
      },
      {
        name: 'No',
        value: false,
      },
    ],
    theme,
  });

  if (!shouldCreateSetupFile) return Ok(undefined);

  const variant = await select({
    message: 'What kind of project would you like to create?',
    choices: Object.values(SupportedFormat).map(fmt => ({
      name: getFileNameForFormat(fmt),
      value: fmt,
    })),
    theme,
  });

  const filePaths = await tryLocaleFilePathsForVariant(variant);

  return await createProjectSetup(variant, filePaths);
}

async function tryLocaleFilePathsForVariant(
  format: SupportedFormat
): Promise<ProjectPathEntry[]> {
  switch (format) {
    case SupportedFormat.JSON:
    case SupportedFormat.YAML:
    case SupportedFormat.XCSTRINGS:
      return [await tryFindSingularPath(format)];
    case SupportedFormat.TS:
      return await tryResolveTs();
    case SupportedFormat.XLIFF:
    case SupportedFormat.PO:
      return [];
    case SupportedFormat.APPLE_STRINGS:
      return await tryResolveAppleStrings();
    case SupportedFormat.ANDROID_STRINGS:
      return await tryResolveAndroidStrings();
  }
}

async function tryResolveAppleStrings(): Promise<ProjectPathEntry[]> {
  const paths = await glob('**/Localizable.strings', getGlobConfig());

  return paths
    .map((path): ProjectPathEntry | undefined => {
      const segment = path.split('/').find(seg => seg.endsWith('.lproj'));

      if (!segment) return;

      const localeString = segment.replace('.lproj', '');
      const result = LocaleDecoder.safeParse(localeString);

      if (!result.success || !result.data) return;

      return { locale: result.data, path };
    })
    .filter(entry => !!entry);
}

async function tryResolveAndroidStrings(): Promise<ProjectPathEntry[]> {
  const results = await glob('**/strings.xml', getGlobConfig());

  return results
    .map((path: string): ProjectPathEntry | undefined => {
      const segment = path.split('/').at(-2);

      const result = LocaleDecoder.safeParse(segment);

      if (!result.success || !result.data) return;

      return { locale: result.data, path };
    })
    .filter(entry => !!entry);
}

// TODO: Implement
async function tryResolveTs(): Promise<ProjectPathEntry[]> {
  const results = await glob('**/labels.ts', getGlobConfig());

  return results
    .map((path: string): ProjectPathEntry | undefined => {
      return { locale: '*', path };
    })
    .filter(entry => !!entry);
}

/**
 * Will attempt to resolve the file path for the provided project format
 */
async function tryFindSingularPath(
  format: SupportedFormat
): Promise<ProjectPathEntry> {
  const extensionsPattern = `{${getFileExtensionsFromFormat(format).join(',')}}`;

  const pattern: string = `**/labels.${extensionsPattern}`;
  const [firstResult] = await glob(pattern, getGlobConfig());

  return { locale: '*', path: firstResult };
}

export function getProjectConfigFilePath(): string {
  const basePath = process.cwd();

  return join(basePath, PROJECT_FILE_NAME);
}

/**
 * Will attempt to find the project setup file in the current working directory
 * @see getProjectConfigFilePath
 */
export async function hasProjectSetupFile(): Promise<boolean> {
  return await fsExists(getProjectConfigFilePath());
}

async function fsExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function getGlobConfig(): GlobOptionsWithFileTypesUnset {
  return {
    cwd: process.cwd(),
    nodir: true,
    absolute: true,
    ignore: GLOB_IGNORE_PATTERNS,
  };
}
