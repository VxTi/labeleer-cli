import { tryCreateLabel } from '@/actions/create-labels';
import { translate } from '@/core/i18n';
import { resolveAccessToken } from '@/project/access-token';
import { inquireUserAction, Action } from '@/inquire/action';
import { inquireProjectConfig }      from '@/project/config';
import { exitMessage, info }         from '@/utils';
import { tryPublishLocalLabels } from '@/actions/publish-labels';
import { tryRetrieveLabels } from '@/actions/retrieve-labels';
import { parseArgs } from 'node:util';
import chalk from 'chalk';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { values } = parseArgs({
    args,
    options: {
      projectId: { type: 'string' },
      accessToken: { type: 'string' },
      format: { type: 'string' },
      path: { type: 'string', multiple: true },
    },
  });
  console.log(
    `${chalk.blue('┏━')} ${chalk.bgBlack.bold.whiteBright(translate({ label: 'cli.title' }))}`
  );

  const accessTokenRes = await resolveAccessToken(values.accessToken);
  if (!accessTokenRes.ok) {
    info(accessTokenRes.error);
    process.exit(1);
  }
  const configRes = await inquireProjectConfig(accessTokenRes.value);
  if (!configRes.ok) {
    info(configRes.error);
    process.exit(1);
  }
  const config = configRes.value;
  const action = await inquireUserAction();

  switch (action) {
    case Action.FETCH_LABELS:
      await tryRetrieveLabels(config);
      return;
    case Action.PUBLISH_LABELS:
      await tryPublishLocalLabels(config);
      return;
    case Action.CREATE_LABEL:
      await tryCreateLabel(config);
      return;
    case Action.CANCEL:
      exitMessage();
  }
}

main().catch(error => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    exitMessage();
    process.exit(0);
  }
  console.error(chalk.red('An unexpected error occurred:'), error);
  process.exit(1);
});
