import { log, theme } from '@/utils';
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { type LabelFile, type ProjectConfig } from 'labeleer-cli';
import { writeFileSync } from 'node:fs';
import ora from 'ora';

export async function tryCreateLabel(config: ProjectConfig) {
  const locales = await tryFetchLanguages(config);
  const labelName = await input({
    message: 'Enter the name of the new label:',
    theme,
    validate: processLabelName,
  });

  if (!locales || locales.length === 0) {
    log(
      'No languages found in the project. Please add languages before creating labels.'
    );
    return;
  }

  const localeTranslations = new Map<string, string>();

  for (const locale of locales) {
    const labelValue = await input({
      message: `Enter the value for locale '${locale}':`,
      theme,
      required: false,
    });

    localeTranslations.set(locale, labelValue);
  }

  if (!localeTranslations.size) {
    log('No translations provided. Label creation aborted.');
    return;
  }

  const currentLabelFile = readFileSync(config.localFilePath, 'utf-8');
  const labelFile = parseLabelFile(currentLabelFile);

  labelFile[labelName] = labelFile[labelName] ?? { translations: {} };
  for (const [locale, translation] of localeTranslations) {
    labelFile[labelName].translations[locale] = translation;
  }

  // Write back to the label file
  const updatedContent = JSON.stringify(labelFile, null, 2);
  writeFileSync(config.localFilePath, updatedContent, 'utf-8');
  log(chalk.blue(`Label '${labelName}' has been added to the label file.`));

  const action = await select(
    {
      message: 'Would you like to create another one?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      theme,
    },
    { clearPromptOnDone: true }
  );
  if (!action) {
    log('Okay, goodbye.');
    return;
  }

  await tryCreateLabel(config);
}

function parseLabelFile(content: string): LabelFile {
  return JSON.parse(content) as LabelFile; // Currently only supports JSON.
}

async function tryFetchLanguages(config: ProjectConfig): Promise<string[]> {
  const loader = ora({
    text: 'Loading languages from project',
    spinner: 'star',
  }).start();
  const locales = await fetch(
    `https://labeleer.com/api/project/${config.projectId}/locale`,
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    }
  )
    .then(res => res.json())
    .then((res: any) => {
      return Object.values(res.data.map((l: any) => l.locale) as object);
    })
    .catch(() => undefined);
  loader.stop();
  return locales as string[];
}

function processLabelName(label: string): boolean {
  return label.replace(/\s+/, '.').replace(/[^a-zA-Z0-9._-]+/g, '-') === label;
}
