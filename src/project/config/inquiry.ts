import { translate } from '@/core/i18n';
import { Err, Ok, type Result } from '@/core/result';
import { cwd, exists, toLabeleerFile } from '@/files';
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
      message: translate({ label: 'project.error.missing' }),
      choices: [
        {
          name: translate({ label: 'project.error.missing.create.yes' }),
          value: true,
        },
        {
          name: translate({ label: 'project.error.missing.create.no' }),
          value: false,
        },
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
      return Err(translate({ label: 'project.error.missingPrimary' }));
    case ProjectReadFailure.LABEL_FILE_MISSING_ONE_OR_MORE:
      return Err(translate({ label: 'project.error.missingSome' }));
    case ProjectReadFailure.PROJECT_FILE_CORRUPT:
      return Err(translate({ label: 'project.error.configCorrupt' }));
    case ProjectReadFailure.NO_LOCALES:
      return Err(translate({ label: 'project.error.noLocales' }));
    case ProjectReadFailure.NETERR_LOCALES:
      return Err(translate({ label: 'project.error.network.locales' }));
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

  return Ok<Config>({
    projectId,
    referenceLocale: localesRes.value.referenceLocale,
    locales: localesRes.value.locales,
    format,
    rootDir,
    accessToken,
    configFile: toLabeleerFile(configFilePath),
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
