import { log, theme } from '@/utils';
import {
  inferFileFormatFromFileName,
  supportedFileFormats,
  toRelativePath,
} from '@/files';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { writeFile } from 'fs/promises';
import type { ProjectConfig } from 'labeleer-cli';
import ora from 'ora';

/**
 * Fetches labels from the remote project and writes them to the local label file.
 */
export async function tryRetrieveLabels(config: ProjectConfig): Promise<void> {
  const format = await tryInferOrInquireFormatFromFileName(
    config.localFilePath
  );

  if (!format) {
    log(chalk.red('No label file format selected. Unable to proceed.'));
    process.exit(1);
  }
  const loader = ora({
    text: 'Retrieving labels...',
    prefixText: chalk.blue('┃'),
  }).start();
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
