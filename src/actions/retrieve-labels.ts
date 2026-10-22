import type { Config } from '@/project/config/common';
import { translate } from '@/core/i18n';
import { getTranslationDataset } from '@/project/dataset';
import { updateLocalLabelFile } from '@/project/label-file';
import { toRelativePath } from '@/files';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Fetches labels from the remote project and writes them to the local label file.
 */
export async function tryRetrieveLabels(config: Config): Promise<void> {
  const loader = ora({
    text: translate({ label: 'actions.retrieve.loading' }),
    prefixText: chalk.blue('┃'),
  }).start();
  const { accessToken, projectId } = config;
  const result = await getTranslationDataset(accessToken, projectId);
  if (!result.ok) {
    loader.fail(chalk.red(translate({ label: 'actions.retrieve.failure' })));
    process.exit(1);
  }

  await updateLocalLabelFile(config, result.value);

  loader.succeed(
    chalk.blue(
      translate({
        label: 'actions.retrieve.success',
        args: [
          config.path.ref === 'single'
            ? toRelativePath(config.path.value.absolutePath)
            : Object.entries(config.path.value)
                .map(
                  ([loc, file]) =>
                    `${loc} -> ${toRelativePath(file.absolutePath)}`
                )
                .join(', '),
        ],
      })
    )
  );
}
