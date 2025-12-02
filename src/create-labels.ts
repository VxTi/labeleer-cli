import makeRequest from '@/fetch';
import { exitMessage, log, theme } from '@/utils';
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { type LabelFile, type ProjectConfig } from 'labeleer-cli';
import { writeFileSync } from 'node:fs';
import ora from 'ora';
import { z } from 'zod';

const languageResponseSchema = z.object({
  data: z.array(
    z.object({
      locale: z.string(),
      isReference: z.boolean(),
    })
  ),
});

type LocaleEntry = z.infer<typeof languageResponseSchema>['data'][number];

export async function tryCreateLabel(config: ProjectConfig) {
  const locales: LocaleEntry[] = await tryFetchLanguages(config);
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

  for (const localeEntry of locales) {
    const labelValue = await input({
      message: `Enter the value for locale ${chalk.underline(getLocaleName(localeEntry.locale))}${chalk.reset(localeEntry.isReference ? ' ★' : '')}:`,
      theme,
      required: localeEntry.isReference,
    });

    localeTranslations.set(localeEntry.locale, labelValue);
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
    exitMessage();
    return;
  }

  await tryCreateLabel(config);
}

function parseLabelFile(content: string): LabelFile {
  return JSON.parse(content) as LabelFile; // Currently only supports JSON.
}

async function tryFetchLanguages(
  config: ProjectConfig
): Promise<LocaleEntry[]> {
  const loader = ora({
    text: 'Loading languages from project',
    spinner: 'star',
  }).start();

  const locales = await makeRequest(
    `/project/${config.projectId}/locale`,
    'GET',
    {
      accessToken: config.accessToken,
      decoder: languageResponseSchema,
    }
  );
  loader.stop();
  if (!locales?.data) {
    loader.fail('Failed to load languages from project.');
    process.exit(1);
  }

  return locales.data;
}

function processLabelName(label: string): boolean {
  return label.replace(/\s+/, '.').replace(/[^a-zA-Z0-9._-]+/g, '-') === label;
}

export function getLocaleName(locale: string): string {
  try {
    const [lang, region] = locale.split(/[_-]/); // support both en_US and en-US formats
    const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

    const language: string | undefined = languageNames.of(lang);
    const regionName: string | undefined = region
      ? regionNames.of(region)
      : undefined;

    if (!language) {
      return locale;
    }
    return regionName ? `${language} (${regionName})` : language;
  } catch {
    return locale;
  }
}
