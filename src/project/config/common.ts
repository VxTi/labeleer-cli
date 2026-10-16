import { Err, Ok, type Result } from '@/core/result';
import {
  isNonEmptyArray,
  mapConstantArray,
  type NonEmptyArray,
} from '@/core/type-utils';
import { inquireCreateLocales } from '@/project/languages';
import { getLanguages } from '@/project/locales';
import type {
  FileFormat,
  Locale,
} from '@labeleer/translation-dataset-transformers';
import path from 'node:path';

export const cwd = process.cwd();

export type AbsolutePath = string & {};

export interface LabeleerFile {
  directoryPath: string;
  filename: string;
  absolutePath: AbsolutePath;
}

export interface Config {
  projectId: string;
  format: FileFormat;
  rootDir: AbsolutePath;
  accessToken: string;
  locales: NonEmptyArray<Locale>;
  referenceLocale: Locale;
  configFile: LabeleerFile;
  path:
    | {
        ref: 'several';
        value: LabeleerFile[];
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
      locales: mapConstantArray(languages, l => l.locale),
    });
  }

  const locales = await inquireCreateLocales();
  if (!locales) {
    return Err('No locales were created');
  }

  return Ok({ locales, referenceLocale: locales[0] });
}

export function toLabeleerFile(filePath: AbsolutePath): LabeleerFile {
  const filename = path.basename(filePath);
  const directoryPath = path.dirname(filePath);
  return {
    directoryPath,
    filename,
    absolutePath: filePath,
  };
}
