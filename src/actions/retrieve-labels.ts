import { getTranslationDataset } from '@/project/dataset';
import { updateLocalLabelFile } from '@/project/label-file';
import { type Config } from '@/project/labeleer-config';
import { isNonEmptyArray } from '@/core/type-utils';
import { toRelativePath } from '@/files';
import { getLanguages } from '@/project/locales';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Fetches labels from the remote project and writes them to the local label file.
 */
export async function tryRetrieveLabels(config: Config): Promise<void> {
  const loader = ora({
    text: 'Retrieving labels...',
    prefixText: chalk.blue('┃'),
  }).start();

  const [dataset, languages] = await Promise.all([
    getTranslationDataset(config),
    getLanguages(config.projectId, config.accessToken),
  ]);
  if (!dataset || !isNonEmptyArray(languages)) {
    loader.fail(chalk.red(`Failed to retrieve labels`));
    process.exit(1);
  }

  await updateLocalLabelFile(config, dataset, languages);

  loader.succeed(
    chalk.blue(
      `Labels have been written to ${chalk.cyan.underline(
        toRelativePath(
          config.path ?? Object.values(config.paths ?? {}).join(', ')
        )
      )}`
    )
  );
}
