import { type LanguageFileFormat }    from '@labeleer/translation-dataset-transformers';
import { getTransformerFromFileName } from '@/files';
import { info }                       from '@/utils';
import chalk                          from 'chalk';
import { readFile } from 'fs/promises';
import type { ProjectConfig } from 'labeleer-cli';
import ora from 'ora';

export async function tryPublishLocalLabels(
  config: ProjectConfig
): Promise<void> {
  const localFileContent: string = await readFile(config.localFilePath, {
    encoding: 'utf-8',
  });
  if (!localFileContent) {
    info(chalk.red('Unable to read local file content. Aborting.'));
    return;
  }

  const fileType: LanguageFileFormat | undefined = getTransformerFromFileName(
    config.localFilePath
  );

  if (!fileType) {
    info(
      chalk.red(
        'Unable to infer file format from label file name. Sync aborted.'
      )
    );
    return;
  }

  if (fileType !== 'json') {
    info(
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
    info(await response.text());
    return;
  }

  loader.succeed(
    chalk.green(`Local labels have been synchronized with remote project`)
  );
}
