import { translate } from '@/core/i18n';
import { readLocalLabelFiles } from '@/project/label-file';
import { type Config } from '@/project/config';
import { info } from '@/utils';
import { labeleer } from '@labeleer/api';
import chalk from 'chalk';
import ora from 'ora';

export async function tryPublishLocalLabels(config: Config): Promise<void> {
  const loader = ora(translate({ label: 'action.publish.loading' })).start();
  const dataset = await readLocalLabelFiles(config);

  const result = await labeleer.project.translations.update({
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
    },
    body: {
      projectId: config.projectId,
      entries: dataset,
    },
  });

  if (!result.data?.success) {
    loader.stopAndPersist({
      symbol: chalk.blue('┃'),
      text: chalk.red(
        `✖ ${translate({ label: 'actions.publish.loading.failure' })}`
      ),
    });
    if (result.error?.error) info(result.error.error);
    return;
  }

  loader.succeed(chalk.green(translate({ label: 'actions.publish.success' })));
}
