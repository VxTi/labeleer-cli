import { SupportedFormat, getFileExtensionFromFormat } from '@labeleer/models';
import { exitMessage, log, theme } from '@/utils';
import { toRelativePath } from '@/files';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { writeFile } from 'fs/promises';
import { glob } from 'glob';

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
const labelFileNames = ['labels'];

export async function labelFilePathWithFallback(
  initialPath?: string
): Promise<{ path: string; isNew: boolean }> {
  if (initialPath) {
    log(
      chalk.blue(
        `Using label file at ${chalk.bgBlack.bold.blueBright.underline(toRelativePath(initialPath))}`
      )
    );
    return { path: initialPath, isNew: false };
  }
  log(chalk.yellow('Unable to locate any label files in your project.'));
  const shouldCreate = await select(
    {
      message: 'Would you like to create and import a new labels file?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      theme,
    },
    { clearPromptOnDone: true }
  );
  if (!shouldCreate) {
    exitMessage();
    process.exit(0);
  }

  const format = await select(
    {
      message: 'Select the label file format to create:',
      choices: Object.values(SupportedFormat).map(format => ({
        name: getFileNameForFormat(format),
        value: getFileExtensionFromFormat(format),
      })),
      theme,
    },
    { clearPromptOnDone: true }
  );

  const newLabelFilePath = `${process.cwd()}/${defaultLabelFileName}.${format}`;
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

function getFileNameForFormat(format: SupportedFormat): string {
  switch (format) {
    case SupportedFormat.ANDROID_STRINGS:
      return 'Android Strings (.xml)';
    case SupportedFormat.APPLE_STRINGS:
      return 'Apple Strings (.strings)';
    case SupportedFormat.JSON:
      return 'JSON (.json)';
    case SupportedFormat.PO:
      return 'Gettext PO (.po)';
    case SupportedFormat.TS:
      return 'Qt Linguist (.ts)';
    case SupportedFormat.XLIFF:
      return 'XLIFF (.xliff)';
    case SupportedFormat.YAML:
      return 'YAML (.yaml/.yml)';
  }
}

export async function tryAcquireLabelFile(): Promise<string | undefined> {
  const formats: string[] = Object.values(SupportedFormat).flatMap(fmt =>
    getFileExtensionFromFormat(fmt)
  );
  const labelFileNamesPattern = `${labelFileNames.join(',')}`;
  const supportedFileFormatsPattern = `{${formats.join(',')}}`;

  const files = await glob(
    `**/${labelFileNamesPattern}.${supportedFileFormatsPattern}`,
    {
      cwd: process.cwd(),
      nodir: true,
      absolute: true,
      ignore: globIgnorePatterns,
    }
  );

  if (!files.length || files.length === 1) {
    return files?.[0];
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
