import { translate } from '@/core/i18n';
import { Ok, type Result } from '@/core/result';
import { entries, fromEntries, isNonEmptyArray } from '@/core/type-utils';
import {
  type AbsolutePath,
  type Config,
  DEFAULT_CONFIG_FILE_NAME,
  type SafeConfig,
  toLabeleerFile,
  tryGetLocales,
} from './config/common';
import { getTranslationDataset } from './dataset';
import { updateLocalLabelFile } from './label-file';
import { theme } from '@/utils';
import { input, select } from '@inquirer/prompts';
import {
  defaultTransformerSet,
  FileFormat,
  isCompressedFormat,
  type Locale,
} from '@labeleer/translation-dataset-transformers';
import { writeFile } from 'fs/promises';
import path from 'node:path';

const cwd = process.cwd();

export async function createProjectConfig(
  accessToken: string
): Promise<Result<Config>> {
  const projectId = await inquireProjectId();
  const format = await inquireFileFormat();

  const localesRes = await tryGetLocales(accessToken, projectId);
  if (!localesRes.ok) return localesRes;

  const translationsResult = await getTranslationDataset(
    accessToken,
    projectId
  );
  if (!translationsResult.ok) return translationsResult;

  const translations = translationsResult.value;
  const configFile = toLabeleerFile(
    path.resolve(cwd, DEFAULT_CONFIG_FILE_NAME)
  );
  const { locales, referenceLocale } = localesRes.value;

  const rootDir = cwd;
  const safeConfig: Omit<SafeConfig, 'configPath'> = {
    projectId,
    format,
    rootDir,
    locales,
    referenceLocale,
    configFile,
    path: getInitialFilePaths(rootDir, format, locales, referenceLocale),
  };

  const config: Config = { ...safeConfig, accessToken };

  await updateLocalLabelFile(config, translations);
  await writeFile(configFile.absolutePath, JSON.stringify(safeConfig, null, 2));

  return Ok(config);
}

function getInitialFilePaths(
  rootDir: AbsolutePath,
  format: FileFormat,
  locales: Locale[],
  referenceLocale: Locale
): Config['path'] {
  // A hacky way to initialize the config file with empty translations
  // This way we get the file paths from the transformer
  const transformer = defaultTransformerSet.getByFormat(format);
  const serialized = transformer.serialize(
    {
      __placeholder: {
        translations: fromEntries(locales.map(loc => [loc, ''])),
      },
    },
    { locales, referenceLocale }
  );

  const paths = entries(serialized).map(([filePath]) =>
    toLabeleerFile(path.resolve(rootDir, filePath))
  );

  if (!isNonEmptyArray(paths)) {
    throw new Error(
      'Something went wrong whilst trying to initialize translation files'
    );
  }

  if (isCompressedFormat(format)) {
    return {
      ref: 'several',
      value: paths,
    };
  }

  return {
    ref: 'single',
    value: paths[0],
  };
}

async function inquireProjectId(): Promise<string> {
  return await input({
    message: translate({ label: 'project.inquire.id' }),
    theme,
  });
}

async function inquireFileFormat(): Promise<FileFormat> {
  return await select({
    message: translate({ label: 'project.inquire.format' }),
    choices: Object.values(FileFormat).map(format => ({
      name: format,
      value: format,
    })),
    theme,
  });
}
