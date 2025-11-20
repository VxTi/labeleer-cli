#!/usr/bin/env node
import { input, password, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { readdir, readFile } from 'fs/promises';
import { glob } from 'glob';
import { writeFile } from 'node:fs/promises';
import ora from 'ora';

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

  localFilePath: string;
}

type PartialConfig = Omit<ProjectConfiguration, 'localFilePath'>;

const supportedFileFormats = ['json', 'yaml', 'xml'] as const;
const labelFileName = 'labels';
const globIgnorePatterns = [
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

type SupportedFileFormat = (typeof supportedFileFormats)[number];

const theme = undefined;

async function main() {
  const partialConfig: PartialConfig | undefined =
    await tryAcquireProjectConfig();

  if (!partialConfig) {
    process.exit(0);
  }

  const possibleLabelFile = await tryAcquireLabelFile();

  const labelFile = await labelFilePathWithFallback(possibleLabelFile);

  const config: ProjectConfiguration = {
    ...partialConfig,
    localFilePath: labelFile,
  };

  const action = await select(
    {
      message: 'Select an action to perform:',
      choices: [
        { name: 'Fetch labels', value: 'fetch' },
        { name: 'Sync to remote', value: 'sync' },
        { name: 'Cancel', value: 'cancel' },
      ],
      theme,
    },
    { clearPromptOnDone: true }
  );

  switch (action) {
    case 'fetch':
      await tryFetchLabels(config);
      return;
    case 'sync':
      await syncWithRemote(config);
      return;
    case 'cancel':
      log(chalk.yellow('Okay, goodbye.'));
  }
}

/**
 * Fetches labels from the remote project and writes them to the local label file.
 */
async function tryFetchLabels(config: ProjectConfiguration): Promise<void> {
  const format = await tryInferOrInquireFormatFromFileName(
    config.localFilePath
  );

  if (!format) {
    log(chalk.red('No label file format selected. Unable to proceed.'));
    process.exit(1);
  }
  const loader = ora('Retrieving labels...').start();
  const response = await fetch(
    `https://labeleer.com/api/project/${config.projectId}/translations/export?format=${format}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    loader.fail(chalk.red(`Failed to fetch labels: ${response.statusText}`));
    process.exit(1);
  }

  const data = await response.text();

  await writeFile(config.localFilePath, data, { encoding: 'utf-8' });

  loader.succeed(
    chalk.blue(
      `Labels have been written to ${chalk.cyan.underline(
        toRelativePath(config.localFilePath)
      )}`
    )
  );
}

async function syncWithRemote(config: ProjectConfiguration): Promise<void> {
  const localFileContent: string = await readFile(config.localFilePath, {
    encoding: 'utf-8',
  });
  const fileType: SupportedFileFormat | undefined = inferFileFormatFromFileName(
    config.localFilePath
  );

  if (!localFileContent) {
    log(chalk.red('Unable to read local file content. Aborting.'));
    return;
  }

  if (!fileType) {
    log(
      chalk.red(
        'Unable to infer file format from label file name. Sync aborted.'
      )
    );
    return;
  }

  if (fileType !== 'json') {
    log(
      chalk.red(
        'Unsupported format. Currently, only JSON is supported for remote synchronization.'
      )
    );
    return;
  }

  const loader = ora('Synchronizing with project...').start();

  const response = await fetch(
    `https://labeleer.com/api/project/${config.projectId}/translations`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: `{"entries":${localFileContent}}`,
    }
  );

  if (!response.ok) {
    loader.fail(
      chalk.red(
        `Something went wrong with the synchronization: ${response.statusText}`
      )
    );
    log(await response.text());
    return;
  }

  loader.succeed(
    chalk.green(`Local labels have been synchronized with remote project`)
  );
}

function toRelativePath(absolutePath: string): string {
  return absolutePath.replace(process.cwd(), '.');
}

function inferFileFormatFromFileName(
  labelFilePath: string
): SupportedFileFormat | undefined {
  return supportedFileFormats.find(ext => labelFilePath.endsWith(`.${ext}`));
}

/**
 * Attempts to infer the label file format from its file name.
 * If the format cannot be inferred, prompts the user to select one.
 *
 * @param labelFilePath - The path to the label file.
 * @returns A Promise that resolves to the inferred or selected file format, or undefined if not selected.
 */
async function tryInferOrInquireFormatFromFileName(
  labelFilePath: string
): Promise<string | undefined> {
  const format = inferFileFormatFromFileName(labelFilePath);
  if (!format) {
    return await select({
      message: 'Select the label file format to fetch:',
      choices: supportedFileFormats.map(format => ({
        name: format,
        value: format,
      })),
      theme,
    });
  }
  return format;
}

async function labelFilePathWithFallback(
  initialPath?: string
): Promise<string> {
  if (initialPath) {
    return initialPath;
  }
  log(chalk.yellow('Unable to locate any label files in your project.'));
  const shouldCreate = await select(
    {
      message: 'Would you like to create a new labels file?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      theme,
    },
    { clearPromptOnDone: true }
  );
  if (!shouldCreate) {
    process.exit(0);
  }

  const format = await select(
    {
      message: 'Select the label file format to create:',
      choices: supportedFileFormats.map(format => ({
        name: format,
        value: format,
      })),
      theme,
    },
    { clearPromptOnDone: true }
  );

  const newLabelFilePath = `${process.cwd()}/${labelFileName}.${format}`;
  await writeFile(newLabelFilePath, '', { encoding: 'utf-8' });
  log(
    chalk.blue(
      `Created new label file at ${chalk.cyan.underline(
        toRelativePath(newLabelFilePath)
      )}`
    )
  );
  return newLabelFilePath;
}

async function tryAcquireLabelFile(): Promise<string | undefined> {
  const files = await glob(
    `**/${labelFileName}.{${supportedFileFormats.join(',')}}`,
    {
      cwd: process.cwd(),
      nodir: true,
      absolute: true,
      ignore: globIgnorePatterns,
    }
  );

  if (!files.length) {
    return undefined;
  }

  if (files.length === 1) {
    return files[0];
  }

  return await select(
    {
      message: 'Multiple label files found. Please select one to use:',
      choices: files.map(filePath => ({
        name: toRelativePath(filePath),
        value: filePath,
      })),
      theme,
    },
    { clearPromptOnDone: true }
  );
}

/**
 * Attempts to acquire the project configuration by searching for .env files
 * in the current working directory. If found, it tries to read the access token
 * and project ID from the selected .env file. If no suitable .env file is found,
 * or if the required variables are missing, it prompts the user for input.
 *
 * @returns A Promise that resolves to the ProjectConfiguration or undefined if not acquired.
 */
async function tryAcquireProjectConfig(): Promise<PartialConfig | undefined> {
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

main().catch(error => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    log(chalk.yellow('Goodbye.'));
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
