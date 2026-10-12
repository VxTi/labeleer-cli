import { Ok, type Result } from '@/core/result';
import {
  isNonEmptyArray,
  isNotNil,
  mapConstantArray,
  type NonEmptyArray,
  type Nullable,
} from '@/core/type-utils';
import { getTranslationDataset } from '@/project/dataset';
import { getLanguages } from '@/project/locales';
import { info, theme } from '@/utils';
import { input, select } from '@inquirer/prompts';
import {
  FileFormat,
  Locales,
  defaultTransformerSet,
  type Locale,
} from '@labeleer/translation-dataset-transformers';
import chalk from 'chalk';
import { readFile, writeFile } from 'fs/promises';
import * as path from 'node:path';
import * as z from 'zod';

const cwd = process.cwd();

const configDecoder = z.object({
  projectId: z.string(),
  format: z.enum(FileFormat),
  paths: z.optional(z.partialRecord(z.enum(Locales), z.string())),
  path: z.optional(z.string()),
  locales: z.array(z.enum(Locales)).refine(arr => isNonEmptyArray(arr)),
  referenceLocale: z.enum(Locales),
});

export type Config = z.infer<typeof configDecoder> & {
  accessToken: string;
  configPath: string;
  locales: NonEmptyArray<Locale>;
  referenceLocale: Locale;
};
export type SafeConfig = Omit<Config, 'accessToken'>;

const DEFAULT_CONFIG_FILE_NAME = 'labeleer.json';
const DEFAULT_LABEL_FILE_NAME = 'labels';

export async function getProjectConfig(
  accessToken: string
): Promise<Nullable<Config>> {
  const configPath: string = path.resolve(cwd, DEFAULT_CONFIG_FILE_NAME);
  return await readFile(configPath, 'utf-8')
    .then((content): unknown => JSON.parse(content))
    .then(json => configDecoder.parseAsync(json))
    .then((parsed): Config => ({ ...parsed, accessToken, configPath }))
    .catch(() => undefined);
}

export async function createProjectConfig(
  accessToken: string,
  projectId: string,
  format: FileFormat
): Promise<Result<Config>> {
  const extension = defaultTransformerSet.getByFormat(format).extensions[0];
  const fileName = `${DEFAULT_LABEL_FILE_NAME}${extension}`;
  const configPath = path.resolve(cwd, DEFAULT_CONFIG_FILE_NAME);
  const labelFilePath = path.resolve(cwd, fileName);

  const languagesRes = await getLanguages(accessToken, projectId);
  if (!languagesRes.ok) return languagesRes;
  const languages = languagesRes.value;
  const translations =
    (await getTranslationDataset(accessToken, projectId)) ?? {};

  const referenceLocale =
    languages.find(locale => locale.is_reference)?.locale ??
    languages[0].locale;

  const config: Omit<SafeConfig, 'configPath'> = {
    projectId,
    format,
    path: path.relative(cwd, labelFilePath),
    locales: mapConstantArray(languages, l => l.locale),
    referenceLocale,
  };

  await writeFile(labelFilePath, JSON.stringify(translations, null, 2));
  await writeFile(configPath, JSON.stringify(config, null, 2));

  return Ok({ ...config, configPath, accessToken });
}

export async function inquireProjectConfig(
  accessToken: string
): Promise<Result<Config>> {
  const config = await getProjectConfig(accessToken);
  if (isNotNil(config)) return Ok(config);

  const createNew = await select({
    message:
      'Unable to locate project settings file. Would you like to create a new one?',
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
