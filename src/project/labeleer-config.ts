import { Err, type ErrorStack, Ok, type Result } from '@/core/result';
import { keys, mapConstantArray } from '@/core/type-utils';
import { getTranslationDataset } from '@/project/dataset';
import { updateLocalLabelFile } from '@/project/label-file';
import { getLanguages } from '@/project/locales';
import { info, theme } from '@/utils';
import { input, select } from '@inquirer/prompts';
import {
  FileFormat,
  Locales,
  type Locale,
} from '@labeleer/translation-dataset-transformers';
import chalk from 'chalk';
import { readFile, writeFile } from 'fs/promises';
import * as path from 'node:path';
import { ZodError } from 'zod';
import * as z from 'zod';

const cwd = process.cwd();

export type RelativePath = string & {};
export type AbsolutePath = string & {};

const configDecoder = z.object({
  projectId: z.string(),
  format: z.enum(FileFormat, {
    error: `expected one of ${Object.values(FileFormat).join(', ')}`,
  }),
  rootDir: z
    .string()
    .describe('The root directory in which the translations files live'),
  paths: z
    .partialRecord(z.enum(Locales), z.string())
    .describe(
      'A dictionary of locale to relative path mapping,' +
        ' relative to the root directory (see rootDir)'
    ),
  referenceLocale: z.enum(Locales, {
    error: 'Expected a POSIX formatted locale',
  }),
});

export interface Config {
  projectId: string;
  format: FileFormat;
  rootDir: RelativePath;
  paths: Partial<Record<Locale, RelativePath>>;
  accessToken: string;
  locales: Locale[];
  referenceLocale: Locale;
  configPath: RelativePath;
}
export type SafeConfig = Omit<Config, 'accessToken'>;

const DEFAULT_CONFIG_FILE_NAME = 'labeleer.json';

type ProjectConfigError = ErrorStack<'format' | 'read'>;

export async function getProjectConfig(
  accessToken: string
): Promise<Result<Config, ProjectConfigError>> {
  const configPath: string = path.resolve(cwd, DEFAULT_CONFIG_FILE_NAME);
  return await readFile(configPath, 'utf-8')
    .then((content): unknown => JSON.parse(content))
    .then(json => configDecoder.parseAsync(json))
    .then(parsed =>
      Ok<Config>({
        ...parsed,
        rootDir: path.resolve(cwd, parsed.rootDir),
        locales: keys(parsed.paths),
        accessToken,
        configPath,
      })
    )
    .catch((err: unknown) => {
      const message: ProjectConfigError =
        err instanceof ZodError
          ? formatZodError(err)
          : {
              type: 'read',
              message: err instanceof Error ? err.message : 'Unknown',
            };
      return Err<ProjectConfigError>(message);
    });
}

function formatZodError(err: ZodError): ProjectConfigError {
  const message = err.issues
    .map(
      issue =>
        `Invalid value for property ${chalk.underline(issue.path.join('.'))}:\n${issue.message}`
    )
    .join('. ');

  return {
    type: 'format',
    message,
  };
}

export async function createProjectConfig(
  accessToken: string,
  projectId: string,
  format: FileFormat
): Promise<Result<Config>> {
  const configPath = path.resolve(cwd, DEFAULT_CONFIG_FILE_NAME);

  const languagesRes = await getLanguages(accessToken, projectId);
  if (!languagesRes.ok) return languagesRes;

  const languages = languagesRes.value;
  const translations =
    (await getTranslationDataset(accessToken, projectId)) ?? {};

  const referenceLocale =
    languages.find(locale => locale.is_reference)?.locale ??
    languages[0].locale;

  const safeConfig: Omit<SafeConfig, 'configPath'> = {
    projectId,
    format,
    rootDir: cwd,
    paths: {},
    locales: mapConstantArray(languages, l => l.locale),
    referenceLocale,
  };

  const config: Config = { ...safeConfig, configPath, accessToken };

  await updateLocalLabelFile(config, translations);
  await writeFile(configPath, JSON.stringify(safeConfig, null, 2));

  return Ok(config);
}

export async function inquireProjectConfig(
  accessToken: string
): Promise<Result<Config>> {
  const config = await getProjectConfig(accessToken);
  if (config.ok) return config;

  if (config.error.type === 'format') {
    const message = `The config file seems to be corrupt.\n${config.error.message}`;

    message.split('\n').forEach(l => info(chalk.red(l)));
    process.exit(0);
  }

  const createNew = await select({
    message: `${config.error.message}. Would you like to create a new one?`,
    choices: [
      { name: 'Yes', value: true },
      { name: 'No', value: false },
    ],
    theme,
  });

  if (!createNew) {
    info(chalk.yellow('Okay, goodbye.'));
    process.exit(0);
  }

  const projectId = await inquireProjectId();
  const fileFormat = await inquireFileFormat();

  const projectRes = await createProjectConfig(
    accessToken,
    projectId,
    fileFormat
  );

  if (!projectRes.ok) return projectRes;

  return Ok({ ...projectRes.value, accessToken });
}

async function inquireProjectId(): Promise<string> {
  return await input({
    message: 'Please enter your project ID',
    theme,
  });
}

async function inquireFileFormat(): Promise<FileFormat> {
  return await select({
    message: 'Select the label file format to fetch:',
    choices: Object.values(FileFormat).map(format => ({
      name: format,
      value: format,
    })),
    theme,
  });
}
