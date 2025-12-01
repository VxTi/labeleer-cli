import { log, theme } from '@/utils';
import { input, password, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { readdir, readFile } from 'fs/promises';
import type { PartialConfig } from 'labeleer-cli';

/**
 * Attempts to acquire the project configuration by searching for .env files
 * in the current working directory. If found, it tries to read the access token
 * and project ID from the selected .env file. If no suitable .env file is found,
 * or if the required variables are missing, it prompts the user for input.
 *
 * @returns A Promise that resolves to the ProjectConfiguration or undefined if not acquired.
 */
export async function tryAcquireProjectConfig(): Promise<
  PartialConfig | undefined
> {
  const envFileExpression = /\.env(\..*)?$/;
  const files = await readdir(process.cwd());
  const dotEnvCandidates: string[] = files.filter(fileName =>
    envFileExpression.test(fileName)
  );

  if (!dotEnvCandidates.length) {
    log(chalk.yellow('Unable to locate any .env files.'));
    return await inquireProjectConfig();
  }

  const dotEnvPath = await tryDeduceEnvFilePath(dotEnvCandidates);

  if (!dotEnvPath) {
    log(chalk.yellow('No .env file selected.'));
    return await inquireProjectConfig();
  }

  const projectFromEnv = await tryReadTokenFromEnv(dotEnvPath);

  if (!projectFromEnv) {
    log(
      chalk.yellow(
        `Unable to locate project configuration from ${chalk.bold.yellowBright(dotEnvPath)}.`
      )
    );
    log(
      chalk.yellow(
        `Make sure it contains both ${chalk.bold.yellowBright('LABELEER_ACCESS_TOKEN')} and ${chalk.bold.yellowBright('LABELEER_PROJECT_ID')}.`
      )
    );
    return await inquireProjectConfig();
  }

  return projectFromEnv;
}

/**
 * Prompts the user to input the project access token and project ID.
 *
 * @returns A Promise that resolves to the ProjectConfiguration or undefined if not provided.
 */
async function inquireProjectConfig(): Promise<PartialConfig | undefined> {
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
async function tryReadTokenFromEnv(
  envFilePath: string
): Promise<PartialConfig | undefined> {
  const content = await readFile(envFilePath, { encoding: 'utf-8' });
  const accessTokenExpr = /^LABELEER.*TOKEN=['"]?([a-zA-Z0-9_-]+)['"]$/;
  const projectIdExpr = /^LABELEER.*PROJECT_ID=['"]?([a-zA-Z0-9_-]+)['"]$/;

  const accessTokenCandidates: string[] = [];
  const projectIdCandidates: string[] = [];

  for (const line of content.split('\n')) {
    const accessTokenMatch = line.match(accessTokenExpr);
    const projectIdMatch = line.match(projectIdExpr);

    if (accessTokenMatch) {
      accessTokenCandidates.push(accessTokenMatch[1]);
    }
    if (projectIdMatch) {
      projectIdCandidates.push(projectIdMatch[1]);
    }
  }

  if (!accessTokenCandidates.length || !projectIdCandidates.length) {
    return undefined;
  }

  if (accessTokenCandidates.length === 1 && projectIdCandidates.length === 1) {
    return {
      accessToken: accessTokenCandidates[0],
      projectId: projectIdCandidates[0],
    };
  }

  const accessToken = await select({
    message: 'Multiple access tokens found. Please select one:',
    choices: accessTokenCandidates.map(token => ({
      name: token,
      value: token,
    })),
    theme,
  });

  const projectId = await select({
    message: 'Multiple project IDs found. Please select one:',
    choices: projectIdCandidates.map(id => ({
      name: id,
      value: id,
    })),
    theme,
  });

  return { accessToken, projectId };
}

/**
 * Prompts the user to select one of the provided .env file candidates.
 *
 * @param candidates - An array of .env file names to choose from.
 * @returns A Promise that resolves to the selected .env file name or undefined if none selected.
 */
async function tryDeduceEnvFilePath(
  candidates: string[]
): Promise<string | undefined> {
  if (candidates.length === 1) {
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
