import {
  hasArrayLength,
  isNonEmptyArray,
  type Nullable,
} from '@/core/type-utils';
import { type BasicProjectConfig } from '@/types';
import { info, theme } from '@/utils';
import { input, password, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { readdir, readFile } from 'fs/promises';
import { isNil } from 'lodash-es';
import { parseEnv } from 'node:util';

/**
 * Attempts to acquire the project configuration by searching for .env files
 * in the current working directory. If found, it tries to read the access token
 * and project ID from the selected .env file. If no suitable .env file is found,
 * or if the required variables are missing, it prompts the user for input.
 *
 * @returns A Promise that resolves to the ProjectConfiguration or undefined if not acquired.
 */
export async function getBasicProjectConfig(): Promise<
  Nullable<BasicProjectConfig>
> {
  const envPath = await getEnvFilePath();

  if (!envPath) {
    info(chalk.yellow('No .env file selected.'));
    return await inquireProjectConfig();
  }

  const projectFromEnv = await extractProjectConfigFromEnv(envPath);

  if (isNil(projectFromEnv)) {
    info(
      chalk.yellow(
        `Unable to locate project configuration from ${chalk.bold.yellowBright(envPath)}.`
      )
    );
    info(
      chalk.yellow(
        `Make sure it contains both ${chalk.bold.yellowBright('LABELEER_ACCESS_TOKEN')} and ${chalk.bold.yellowBright('LABELEER_PROJECT_ID')}.`
      )
    );
    return await inquireProjectConfig();
  }

  info(
    chalk.blue('Using environment file ') +
      chalk.bold.underline.bgBlack.blueBright(`${envPath}`) +
      chalk.blue(' for project configuration.')
  );

  return projectFromEnv;
}

/**
 * Prompts the user to input the project access token and project ID.
 *
 * @returns A Promise that resolves to the ProjectConfiguration or undefined if not provided.
 */
async function inquireProjectConfig(): Promise<BasicProjectConfig> {
  const accessToken = await password(
    {
      message: 'Please enter your project access token:',
      mask: true,
    },
    { clearPromptOnDone: true }
  );

  const projectId = await input(
    { message: 'Please enter your project ID:' },
    { clearPromptOnDone: true }
  );

  return { projectId, accessToken };
}

/**
 * Reads the specified .env file to extract the project access token and project ID.
 * If multiple tokens or IDs are found, prompts the user to select one of each.
 *
 * @param envFilePath - The path to the .env file.
 * @returns A Promise that resolves to the ProjectConfiguration or undefined if not found.
 */
async function extractProjectConfigFromEnv(
  envFilePath: string
): Promise<Nullable<BasicProjectConfig>> {
  const content = await readFile(envFilePath, { encoding: 'utf-8' });
  const parsed = parseEnv(content);

  type KeyPair = { key: string; value: string };

  const accessTokenCandidates: KeyPair[] = [];
  const projectIdCandidates: KeyPair[] = [];

  Object.entries(parsed).forEach(([key, value]) => {
    if (!key.includes('LABELEER') || isNil(value)) return; // Skip non-labaeleer-like vars

    if (key.includes('TOKEN') || key.includes('PROJECT')) {
      accessTokenCandidates.push({ key, value });
    }
  });

  if (
    !isNonEmptyArray(accessTokenCandidates) ||
    !isNonEmptyArray(projectIdCandidates)
  ) {
    return undefined;
  }

  const accessToken = hasArrayLength(accessTokenCandidates, 1)
    ? accessTokenCandidates[0].value
    : await select({
        message: 'Multiple access tokens found. Please select one:',
        choices: accessTokenCandidates.map(({ key, value }) => ({
          name: key,
          value,
        })),
        theme,
      });

  const projectId = hasArrayLength(projectIdCandidates, 1)
    ? projectIdCandidates[0].value
    : await select({
        message: 'Multiple project IDs found. Please select one:',
        choices: projectIdCandidates.map(({ key, value }) => ({
          name: key,
          value,
        })),
        theme,
      });

  return { accessToken, projectId };
}

/**
 * Prompts the user to select one of the provided .env file candidates.
 *
 * @returns A Promise that resolves to the selected .env file name or undefined if none selected.
 */
async function getEnvFilePath(): Promise<string | undefined> {
  const envFileExpression = /\.env(\..*)?$/;
  const files = await readdir(process.cwd());
  const candidates: string[] = files.filter(fileName =>
    envFileExpression.test(fileName)
  );
  if (!isNonEmptyArray(candidates)) {
    return undefined;
  }

  if (hasArrayLength(candidates, 1)) {
    return candidates[0];
  }

  return await select(
    {
      message: 'Identified multiple .env files. Please select one to use:',
      choices: candidates.map(fileName => ({
        name: fileName,
        value: fileName,
      })),
      theme,
    },
    { clearPromptOnDone: true }
  );
}
