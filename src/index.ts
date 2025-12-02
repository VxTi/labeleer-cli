#!/usr/bin/env node
import { tryCreateLabel } from '@/create-labels';
import {
  labelFilePathWithFallback,
  tryAcquireLabelFile,
}                         from '@/label-file-localization';
import { tryAcquireProjectConfig }             from '@/project-settings';
import { exitMessage, log, theme, UserAction } from '@/utils';
import { tryPublishLocalLabels }               from '@/publish-labels';
import { tryRetrieveLabels } from '@/retrieve-labels';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { type PartialConfig, type ProjectConfig } from 'labeleer-cli';

async function main() {
  console.log(
    `${chalk.blue('┏━')} ${chalk.bgBlack.bold.whiteBright('Labeleer CLI')}`
  );
  const partialConfig: PartialConfig | undefined =
    await tryAcquireProjectConfig();

  if (!partialConfig) {
    process.exit(0);
  }

  const possibleLabelFile = await tryAcquireLabelFile();

  const { path, isNew } = await labelFilePathWithFallback(possibleLabelFile);

  const config: ProjectConfig = {
    ...partialConfig,
    localFilePath: path,
  };

  const action = await select(
    {
      message: 'What would you like to do?',
      choices: [
        { name: 'Retrieve', value: UserAction.RETRIEVE },
        { name: 'Publish', value: UserAction.PUBLISH, disabled: isNew },
        { name: 'Create New Label', value: UserAction.CREATE },
        { name: '⨯ Cancel', value: UserAction.CANCEL },
      ],
      theme,
    },
    { clearPromptOnDone: true }
  );

  switch (action) {
    case UserAction.RETRIEVE:
      await tryRetrieveLabels(config);
      return;
    case UserAction.PUBLISH:
      await tryPublishLocalLabels(config);
      return;
    case UserAction.CREATE:
      await tryCreateLabel(config);
      return;
    case UserAction.CANCEL:
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
