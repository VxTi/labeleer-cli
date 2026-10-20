import { Err, Ok, type Result } from '@/core/result';
import { getTranslationDataset } from '@/project/dataset';
import { entries, fromEntries } from '@vxti/typed';
import fs from 'node:fs';
import ora from 'ora';
import { ProjectConfigSchema } from './schema';
import {
  type Config,
  cwd,
  DEFAULT_CONFIG_FILE_NAME,
  toLabeleerFile,
  tryGetLocales,
} from './common';
import { createProjectConfig } from '../create-project';
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

  const createNew = await select({
    message: `${config.error}.\n    Would you like to create a new one?`,
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

  const projectRes = await createProjectConfig(accessToken, configPath);

  if (!projectRes.ok) return projectRes;

  return Ok({ ...projectRes.value, accessToken });
}

export async function getProjectConfig(
  accessToken: string,
  configPath?: string
): Promise<Result<Config>> {
  const configFilePath: string =
    configPath ?? path.resolve(cwd, DEFAULT_CONFIG_FILE_NAME);

  if (!fs.existsSync(configFilePath)) {
    return Err("It seems you don't have a project config file yet");
  }

  const config = await readFile(configFilePath, 'utf-8').then(content =>
    ProjectConfigSchema.parseAsync(JSON.parse(content))
  );

  const localesRes = await tryGetLocales(accessToken, config.projectId);
  if (!localesRes.ok) return localesRes;

  const translationsResult = await getTranslationDataset(
    accessToken,
    config.projectId
  );
  if (!translationsResult.ok) return translationsResult;
  const translations = translationsResult.value;

  const { projectId, format } = config;

  const rootDir = path.resolve(cwd, config.rootDir);
  return Ok<Config>({
    projectId,
    referenceLocale: localesRes.value.referenceLocale,
    locales: localesRes.value.locales,
    format,
    rootDir,
    accessToken,
    configFile: toLabeleerFile(configFilePath),
    translations,
    path:
      config.type === 'single'
        ? {
            ref: 'single',
            value: toLabeleerFile(path.resolve(cwd, config.labelFile)),
          }
        : {
            ref: 'several',
            value: fromEntries(
              entries(config.paths).map(([locale, relativePath]) => [
                locale,
                toLabeleerFile(path.resolve(rootDir, relativePath!)),
              ])
            ),
          },
  });
}
