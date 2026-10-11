import {
  readLocalLabelFiles,
  updateLocalLabelFile,
} from '@/project/label-file';
import { type Config } from '@/project/labeleer-config';
import { exitMessage, info, theme } from '@/utils';
import { input, select } from '@inquirer/prompts';
import {
  getLocaleName,
  type Locale,
} from '@labeleer/translation-dataset-transformers';
import chalk from 'chalk';

export async function tryCreateLabel(config: Config) {
  const labelName = await input({
    message: 'Enter the name of the new label:',
    theme,
  });

  const localeTranslations = new Map<Locale, string>();

  for (const locale of config.locales) {
    const ref = config.referenceLocale === locale;
    const labelValue = await input({
      message: `Enter the value for locale ${chalk.underline(getLocaleName(locale))}${chalk.reset(ref ? ' ★' : '')}:`,
      theme,
      required: ref,
    });

    localeTranslations.set(locale, labelValue);
  }

  if (!localeTranslations.size) {
    info('No translations provided. Label creation aborted.');
    return;
  }

  const dataset = await readLocalLabelFiles(config);

  localeTranslations.entries().forEach(([locale, translation]) => {
    dataset[labelName] = dataset[labelName] ?? { translations: {} };
    dataset[labelName].translations[locale] = translation;
  });

  // Write back to the label file
  await updateLocalLabelFile(config, dataset);
  info(chalk.blue(`Label '${labelName}' has been added to the label file.`));

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
