import { Err, Ok, type Result } from '@/core/result';
import { type AbsolutePath, type LabeleerFile } from '@/files';
import {
  isNonEmptyArray,
  mapConstantArray,
  type NonEmptyArray,
} from '@vxti/typed';
import { inquireCreateLocales } from '@/project/languages';
import { getLanguages } from '@/project/locales';
import type {
  FileFormat,
  Locale,
  TranslationDataset,
} from '@labeleer/translation-dataset-transformers';

export interface Config {
  projectId: string;
  format: FileFormat;
  rootDir: AbsolutePath;
  accessToken: string;
  locales: NonEmptyArray<Locale>;
  referenceLocale: Locale;
  configFile: LabeleerFile;
  translations: TranslationDataset;
  path:
    | {
        ref: 'several';
        value: Partial<Record<Locale, LabeleerFile>>;
      }
    | {
        ref: 'single';
        value: LabeleerFile;
      };
}
export type SafeConfig = Omit<Config, 'accessToken'>;

export const DEFAULT_CONFIG_FILE_NAME = 'labeleer.json';

export async function tryGetLocales(
  accessToken: string,
  projectId: string
): Promise<
  Result<{ locales: NonEmptyArray<Locale>; referenceLocale: Locale }>
> {
  const languagesRes = await getLanguages(accessToken, projectId);

  if (!languagesRes.ok) return languagesRes;
  const languages = languagesRes.value;

  if (isNonEmptyArray(languages)) {
    const referenceLocale =
      languages.find(locale => locale.is_reference)?.locale ??
      languages[0].locale;

    return Ok({
      referenceLocale,
      locales: mapConstantArray(
        languages,
        l => l.locale
      ) as NonEmptyArray<Locale>,
    });
  }

  const locales = await inquireCreateLocales();
  if (!locales) {
    return Err('No locales were created');
  }

  return Ok({ locales, referenceLocale: locales[0] });
}
