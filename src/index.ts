#!/usr/bin/env node
import { tryCreateLabel } from '@/create-labels';
import { inquireUserAction, UserAction } from '@/inquire/user-action';
import {
  extractOrInquireLabelFilePaths,
  tryFindLabelFiles,
} from '@/label-file-finder';
import { tryAcquireProjectConfig } from '@/project-settings';
import { exitMessage } from '@/utils';
import { tryPublishLocalLabels } from '@/publish-labels';
import { tryRetrieveLabels } from '@/retrieve-labels';
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

  const possibleLabelFiles: string[] = await tryFindLabelFiles();

  const { path: localFilePath, isNew } =
    await extractOrInquireLabelFilePaths(possibleLabelFiles);

  const config: ProjectConfig = {
    ...partialConfig,
    localFilePath,
  };

  const action = await inquireUserAction({ isNew });

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
