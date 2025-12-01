#!/usr/bin/env node
import {
  labelFilePathWithFallback,
  tryAcquireLabelFile,
} from '@/label-file-localization';
import { tryAcquireProjectConfig } from '@/project-settings';
import { log, theme } from '@/utils';
import { syncWithRemote } from '@/publish-labels';
import { tryFetchLabels } from '@/retrieve-labels';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { type PartialConfig, type ProjectConfiguration } from 'labeleer-cli';

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
        { name: '⨯ Cancel', value: 'cancel' },
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

main().catch(error => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    log(chalk.yellow('Goodbye.'));
    process.exit(0);
  }
  console.error(chalk.red('An unexpected error occurred:'), error);
  process.exit(1);
});
