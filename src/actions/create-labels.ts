import { translate } from '@/core/i18n';
import { Ok, type Result } from '@/core/result';
import {
  readLocalLabelFiles,
  updateLocalLabelFile,
}                                   from '@/project/label-file';
import { type Config }              from '@/project/config';
import { exitMessage, info, theme } from '@/utils';
import { input, select } from '@inquirer/prompts';
import { labeleer } from '@labeleer/api';
import {
  getLocaleName,
  type Locale,
  MIN_TRANSLATION_KEY_LENGTH,
  type TranslationDataset,
} from '@labeleer/translation-dataset-transformers';
import chalk from 'chalk';

export async function tryCreateLabel(config: Config) {
  const labelName = await input({
    message: translate({ label: 'action.create.title' }),
    theme,
    validate: v =>
      v.length < MIN_TRANSLATION_KEY_LENGTH
        ? translate({ label: 'action.create.error.tooShort' })
        : true,
  });

  const localeTranslations = new Map<Locale, string>();

  for (const locale of config.locales) {
    const ref = config.referenceLocale === locale;
    const labelValue = await input({
      message: translate({
        label: 'action.create.value',
        args: [
          chalk.underline(getLocaleName(locale)),
          chalk.reset(ref ? ' ★' : ''),
        ],
      }),
      theme,
      required: ref,
    });

    localeTranslations.set(locale, labelValue);
  }

  if (!localeTranslations.size) {
    info(translate({ label: 'action.create.error.empty' }));
    return;
  }

  const dataset = await readLocalLabelFiles(config);

  localeTranslations.entries().forEach(([locale, translation]) => {
    dataset[labelName] = dataset[labelName] ?? { translations: {} };
    dataset[labelName].translations[locale] = translation;
  });

  // Write back to the label file
  await updateLocalLabelFile(config, dataset);
  info(
    chalk.blue(
      translate({
        label: 'actions.create.success',
        args: [chalk.underline(labelName)],
      })
    )
  );

  await publishToLabeleer(config, labelName, localeTranslations);

  const action = await select(
    {
      message: translate({ label: 'action.create.additional' }),
      choices: [
        {
          name: translate({ label: 'action.create.additional.yes' }),
          value: true,
        },
        {
          name: translate({ label: 'action.create.additional.no' }),
          value: false,
        },
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

async function publishToLabeleer(
  config: Config,
  labelName: string,
  map: Map<Locale, string>
): Promise<Result<boolean>> {
  const dataset: TranslationDataset = {};
  map.forEach((translation, locale) => {
    dataset[labelName] = dataset[labelName] ?? { translations: {} };
    dataset[labelName].translations[locale] = translation;
  });
  const result = await labeleer.project.translations.update({
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
    },
    body: {
      projectId: config.projectId,
      entries: dataset,
    },
  });

  if (result.data?.success) return Ok(true);

  return Ok(false);
}
