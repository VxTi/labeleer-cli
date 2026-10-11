import { tryCreateLabel } from '@/actions/create-labels';
import { type Nullable } from '@/core/type-utils';
import { getFileNameForFormat } from '@/formatting';
import { inquireUserAction, Action } from '@/inquire/action';
import { getBasicProjectConfig } from '@/project-settings';
import { type BasicProjectConfig } from '@/types';
import { exitMessage, info, theme } from '@/utils';
import { tryPublishLocalLabels } from '@/actions/publish-labels';
import { tryRetrieveLabels } from '@/actions/retrieve-labels';
import { select } from '@inquirer/prompts';
import { labeleer } from '@labeleer/api';
import {
  defaultTransformerSet,
  FileFormat,
} from '@labeleer/translation-dataset-transformers';
import chalk from 'chalk';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'path';
import { parseArgs } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { values } = parseArgs({
    args,
    options: {
      init: { type: 'boolean', short: 'i', default: false },
      projectId: { type: 'string' },
      accessToken: { type: 'string' },
    },
  });
  console.log(
    `${chalk.blue('┏━')} ${chalk.bgBlack.bold.whiteBright('Labeleer CLI')}`
  );

  if (values.init) {
    await initializeProject();
    return;
  }

  const config: Nullable<BasicProjectConfig> = await getBasicProjectConfig();

  if (!config) {
    process.exit(0);
  }

  const { data, error } = await labeleer.project.translations.locales.get({
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
    },
    query: {
      projectId: config.projectId,
    },
  });

  if (error) {
    console.error(error);
    process.exit(1);
  }
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

async function initializeProject(): Promise<void> {
  const finalFormat = await select({
    message: 'What kind of project would you like to create?',
    choices: Object.values(FileFormat).map(fmt => ({
      name: getFileNameForFormat(fmt),
      value: fmt,
    })),
    theme,
  });

  const extension =
    defaultTransformerSet.getByFormat(finalFormat).extensions[0];

  const path = join(__dirname, `labels${extension}`);
  if (existsSync(path)) {
    info('Labels file already exists.');
    process.exit(0);
  }
  info(
    `Initialized project at ${chalk.underline(path.replace(__dirname, '.'))}`
  );
}

main().catch(error => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    exitMessage();
    process.exit(0);
  }
  console.error(chalk.red('An unexpected error occurred:'), error);
  process.exit(1);
});
