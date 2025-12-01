import { log } from '@/utils';
import { inferFileFormatFromFileName, type SupportedFileFormat } from '@/files';
import chalk from 'chalk';
import { readFile } from 'fs/promises';
import type { ProjectConfig } from 'labeleer-cli';
import ora from 'ora';

export async function tryPublishLocalLabels(
  config: ProjectConfig
): Promise<void> {
  const localFileContent: string = await readFile(config.localFilePath, {
    encoding: 'utf-8',
  });
  const fileType: SupportedFileFormat | undefined = inferFileFormatFromFileName(
    config.localFilePath
  );

  if (!localFileContent) {
    log(chalk.red('Unable to read local file content. Aborting.'));
    return;
  }

  if (!fileType) {
    log(
      chalk.red(
        'Unable to infer file format from label file name. Sync aborted.'
      )
    );
    return;
  }

  if (fileType !== 'json') {
    log(
      chalk.red(
        'Unsupported format. Currently, only JSON is supported for remote synchronization.'
      )
    );
    return;
  }

  const loader = ora('Synchronizing with project...').start();

  const response = await fetch(
    `https://labeleer.com/api/project/${config.projectId}/translations`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: `{"entries":${localFileContent}}`,
    }
  );

  if (!response.ok) {
    loader.fail(
      chalk.red(
        `Something went wrong with the synchronization: ${response.statusText}`
      )
    );
    log(await response.text());
    return;
  }

  loader.succeed(
    chalk.green(`Local labels have been synchronized with remote project`)
  );
}
