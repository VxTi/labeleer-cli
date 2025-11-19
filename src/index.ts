import { input, password, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { readdir, readFile } from 'fs/promises';
import { glob } from 'glob';
import { writeFile } from 'node:fs/promises';

/**
 * Represents the configuration required to access a project.
 */
interface ProjectConfiguration {
  /**
   * The unique identifier of the project.
   * This is the segment after `../projects/` in the project URL.
   */
  projectId: string;
  /**
   * The access token used for authenticating requests to the project.
   * This can be acquired in the `'Settings'` screen under the `'Access Tokens'` section.
   */
  accessToken: string;
}

const supportedFileFormats = ['json', 'yaml', 'yml'];
const labelFileName = 'labels';

async function main() {
  const config: ProjectConfiguration | undefined =
    await tryAcquireProjectConfig();

  if (!config) {
    log(chalk.red('Unable to proceed without an access token.'));
    process.exit(1);
  }

  const action = await select(
    {
      message: 'Select an action to perform:',
      choices: [
        { name: 'Synchronize local with remote', value: 'sync' },
        { name: 'Fetch labels from remote', value: 'fetch' },
      ],
    },
    { clearPromptOnDone: true }
  );

  switch (action) {
    case 'fetch':
      await tryFetchLabels(config);
      log(chalk.green('Labels fetched successfully!'));
      return;
    case 'sync':
      log(chalk.yellow('Synchronization feature is not implemented yet.'));
      return;
    default:
      log(chalk.red('Unknown action selected.'));
      process.exit(1);
  }
}

async function tryFetchLabels(
  projectConfig: ProjectConfiguration
): Promise<void> {
  const labelFilePath = await tryAcquireLabelFile();

  if (!labelFilePath) {
    log(chalk.red('No label file selected. Unable to proceed.'));
    process.exit(1);
  }
  const format = await tryInferFormatFromFileName(labelFilePath);

  if (!format) {
    log(chalk.red('No label file format selected. Unable to proceed.'));
    process.exit(1);
  }

  const response = await fetch(
    `https://labeleer.com/api/project/${projectConfig.projectId}/translations/export?format=${format}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${projectConfig.accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    log(chalk.red(`Failed to fetch labels: ${response.statusText}`));
    process.exit(1);
  }

  const data = await response.text();

  await writeFile(labelFilePath, data, { encoding: 'utf-8' });

  log(chalk.green(`Labels written to ${labelFilePath}`));
}

async function tryInferFormatFromFileName(
  labelFilePath: string
): Promise<string | undefined> {
  const format = supportedFileFormats.find(ext =>
    labelFilePath.endsWith(`.${ext}`)
  );
  if (!format) {
    return await select({
      message: 'Select the label file format to fetch:',
      choices: supportedFileFormats.map(format => ({
        name: format,
        value: format,
      })),
    });
  }
  return format;
}

async function tryAcquireLabelFile(): Promise<string | undefined> {
  const files = await glob(
    `**/${labelFileName}.{${supportedFileFormats.join(',')}}`,
    {
      cwd: process.cwd(),
      nodir: true,
      absolute: true,
    }
  );

  if (!files.length) {
    // Inquire?
    log(chalk.yellow('No label files found in the current directory.'));
    return undefined;
  }

  if (files.length === 1) {
    return files[0];
  }

  return await select({
    message: 'Multiple label files found. Please select one to use:',
    choices: files.map(filePath => ({
      name: filePath,
      value: filePath,
    })),
  });
}

/**
 * Attempts to acquire the project configuration by searching for .env files
 * in the current working directory. If found, it tries to read the access token
 * and project ID from the selected .env file. If no suitable .env file is found,
 * or if the required variables are missing, it prompts the user for input.
 *
 * @returns A Promise that resolves to the ProjectConfiguration or undefined if not acquired.
 */
async function tryAcquireProjectConfig(): Promise<
  ProjectConfiguration | undefined
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
        `Unable to locate project configuration in the selected .env file (${dotEnvPath}).\nMake sure it contains LABELEER_<ENV>_TOKEN and LABELEER_<ENV>_PROJECT_ID variables.`
      )
    );
    return await inquireProjectConfig();
  }

  return projectFromEnv;
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

  return await select({
    message: 'Identified multiple .env files. Please select one to use:',
    choices: candidates.map(fileName => ({
      name: fileName,
      value: fileName,
    })),
  });
}

/**
 * Prompts the user to input the project access token and project ID.
 *
 * @returns A Promise that resolves to the ProjectConfiguration or undefined if not provided.
 */
async function inquireProjectConfig(): Promise<
  ProjectConfiguration | undefined
> {
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
): Promise<ProjectConfiguration | undefined> {
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
  });

  const projectId = await select({
    message: 'Multiple project IDs found. Please select one:',
    choices: projectIdCandidates.map(id => ({
      name: id,
      value: id,
    })),
  });

  return { accessToken, projectId };
}

main().catch(error => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    log(chalk.yellow('Cancelling content synchronization.'));
    process.exit(0);
  }
  console.error(chalk.red('An unexpected error occurred:'), error);
  process.exit(1);
});

function log(...args: any[]) {
  console.log(
    chalk.bgBlack.bold.whiteBright('Labeleer') + chalk.reset.white(' ▪'),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    ...args
  );
}
