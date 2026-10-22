import { Err, Ok, type Result } from '@/core/result';
import { cwd, exists, toLabeleerFile } from '@/files';
import { getTranslationDataset } from '@/project/dataset';
import { entries, fromEntries } from '@vxti/typed';
import fs from 'node:fs';
import ora from 'ora';
import { type z } from 'zod';
import { ProjectConfigSchema } from './schema';
import {
  type Config,
  DEFAULT_CONFIG_FILE_NAME,
  type Paths,
  ProjectReadFailure,
  tryGetLocales,
} from './common';
import { createProjectConfig } from './create';
import { exitMessage, theme } from '@/utils';
import { select } from '@inquirer/prompts';
import { readFile } from 'fs/promises';
import path from 'node:path';

export async function inquireProjectConfig(
  accessToken: string,
  configPath?: string
): Promise<Result<Config>> {
  const spinner = ora('Loading project configuration...').start();
  const config = await getProjectConfig(accessToken, configPath);
  spinner.stop();
  if (config.ok) return config;

  if (config.error === ProjectReadFailure.PROJECT_FILE_MISSING) {
    const createNew = await select({
      message: `Failed to load project:\n    ${config.error}.\n    Would you like to create a new one?`,
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      theme,
    });

    if (!createNew) {
      exitMessage();
      process.exit(0);
    }

    return await createProjectConfig(accessToken, configPath);
  }

  switch (config.error) {
    case ProjectReadFailure.LABEL_FILE_MISSING_PRIMARY:
      return Err(
        'Your main label file seems to be missing.\nMake sure your project config points to the right file path'
      );
    case ProjectReadFailure.LABEL_FILE_MISSING_ONE_OR_MORE:
      return Err('One or more translation files are missing');
    case ProjectReadFailure.PROJECT_FILE_CORRUPT:
      return Err('Your project file seems to be corrupt');
    case ProjectReadFailure.NO_LOCALES:
      return Err('Your project seems to not contain any languages');
    case ProjectReadFailure.NETERR_LOCALES:
      return Err("Something went wrong whilst getting the project's languages");
    case ProjectReadFailure.NETERR_TRANSLATIONS:
      return Err(
        "Something went wrong whilst getting the project's translations"
      );
  }
}

export async function getProjectConfig(
  accessToken: string,
  configPath?: string
): Promise<Result<Config, ProjectReadFailure>> {
  const configFilePath: string =
    configPath ?? path.resolve(cwd, DEFAULT_CONFIG_FILE_NAME);

  if (!fs.existsSync(configFilePath)) {
    return Err(ProjectReadFailure.PROJECT_FILE_MISSING);
  }

  const config = await readFile(configFilePath, 'utf-8').then(content =>
    ProjectConfigSchema.parseAsync(JSON.parse(content))
  );
  const rootDir = path.resolve(cwd, config.rootDir);
  const translationFilePath: Paths = resolveFilePaths(rootDir, config);
  const existenceRes = await checkForLabelsExistence(translationFilePath);
  const { projectId, format } = config;

  if (!existenceRes.ok) return existenceRes;

  const localesRes = await tryGetLocales(accessToken, projectId);
  if (!localesRes.ok) return localesRes;

  const translationsResult = await getTranslationDataset(
    accessToken,
    projectId
  );
  if (!translationsResult.ok) return translationsResult;
  const translations = translationsResult.value;

  return Ok<Config>({
    projectId,
    referenceLocale: localesRes.value.referenceLocale,
    locales: localesRes.value.locales,
    format,
    rootDir,
    accessToken,
    configFile: toLabeleerFile(configFilePath),
    translations,
    path: translationFilePath,
  });
}

function resolveFilePaths(
  rootDir: string,
  rawConfig: z.infer<typeof ProjectConfigSchema>
): Paths {
  if (rawConfig.type === 'single') {
    return {
      ref: 'single',
      value: toLabeleerFile(path.resolve(cwd, rawConfig.labelFile)),
    };
  }
  return {
    ref: 'several',
    value: fromEntries(
      entries(rawConfig.paths).map(([locale, relativePath]) => [
        locale,
        toLabeleerFile(path.resolve(rootDir, relativePath!)),
      ])
    ),
  };
}

async function checkForLabelsExistence(
  path: Paths
): Promise<Result<undefined, ProjectReadFailure>> {
  if (path.ref === 'single') {
    return await exists(path.value.absolutePath)
      .then(() => Ok())
      .catch(() => Err(ProjectReadFailure.LABEL_FILE_MISSING_PRIMARY));
  }

  return await Promise.all(
    entries(path.value).map(([_, file]) =>
      exists(file!.absolutePath)
        .then(() => Ok())
        .catch(() => Err(ProjectReadFailure.LABEL_FILE_MISSING_ONE_OR_MORE))
    )
  ).then(res => res.reduce((acc, cur) => (acc.ok ? cur : acc), Ok()));
}
