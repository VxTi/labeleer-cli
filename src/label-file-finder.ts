import { getFileNameForFormat } from '@/formatting';
import { inquireContinuationChoice } from '@/inquire/continuation-choice';
import {
  SupportedFormat,
  getFileExtensionsFromFormat,
} from '@labeleer/translation-dataset-transformers';
import { exitMessage, log, theme } from '@/utils';
import { toRelativePath } from '@/files';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { writeFile } from 'fs/promises';
import { glob } from 'glob';

export interface FileIdentificationResult {
  path: string;
  isNew: boolean;
}

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
const defaultLabelFileName = 'labels';
const labelFileNames = ['labels', 'strings'];

export async function extractOrInquireLabelFilePaths(
  initialPath: string[]
): Promise<FileIdentificationResult> {
  if (initialPath.length === 0) {
    return await handleMissingLabelFiles();
  }

  log(
    chalk.blue(
      `Using label file at ${chalk.bgBlack.bold.blueBright.underline(toRelativePath(initialPath))}`
    )
  );
  return { path: initialPath, isNew: false };
}

async function handleMissingLabelFiles(): Promise<FileIdentificationResult> {
  log(chalk.yellow('Unable to locate any label files in your project.'));

  const shouldCreate = await inquireContinuationChoice({
    message: 'Would you like to create and import a new labels' + ' file?',
  });
  if (!shouldCreate) {
    exitMessage();
    process.exit(0);
  }

  const supportedFormats = Object.values(SupportedFormat);

  const format = await select(
    {
      message: 'Select the label file format to create:',
      choices: supportedFormats.map(format => ({
        name: getFileNameForFormat(format),
        value: getFileExtensionsFromFormat(format)[0],
      })),
      theme,
    },
    { clearPromptOnDone: true }
  );

  const newLabelFilePath = `${process.cwd()}/${defaultLabelFileName}${format}`;
  await writeFile(newLabelFilePath, '', { encoding: 'utf-8' });
  log(
    chalk.blue(
      `Created new label file at ${chalk.cyan.underline(
        toRelativePath(newLabelFilePath)
      )}`
    )
  );
  return { path: newLabelFilePath, isNew: true };
}

/**
 * Attempts to find a label file in the current working directory or its subdirectories.
 * If multiple label files are found, prompts the user to select one.
 *
 * @returns A Promise that resolves to the path of the found label file, or undefined if none found.
 */
export async function tryFindLabelFiles(): Promise<string[]> {
  const extensions: string[] = Object.values(SupportedFormat).flatMap(fmt =>
    getFileExtensionsFromFormat(fmt)
  );
  const labelFileNamesPattern = `{${labelFileNames.join(',')}}`;
  const extensionsPattern = `{${extensions.join(',')}}`;

  const pattern: string = `**/${labelFileNamesPattern}.${extensionsPattern}`;

  return await glob(pattern, {
    cwd: process.cwd(),
    nodir: true,
    absolute: true,
    ignore: globIgnorePatterns,
  });
}
