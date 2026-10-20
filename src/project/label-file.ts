import { entries, fromEntries, isNil } from '@vxti/typed';
import type { Config, LabeleerFile } from './config/common';
import {
  defaultTransformerSet,
  type Locale,
  type ParsingOptions,
  type SerializationFile,
  type TranslationDataset,
} from '@labeleer/translation-dataset-transformers';
import { readFile } from 'fs/promises';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function readLocalLabelFiles(
  config: Config
): Promise<TranslationDataset> {
  const transformer = defaultTransformerSet.getByFormat(config.format);
  const options: ParsingOptions = { referenceLocale: config.referenceLocale };

  const pairs: [Locale, LabeleerFile][] =
    config.path.ref === 'several'
      ? (entries(config.path.value) as [Locale, LabeleerFile][])
      : [[config.referenceLocale, config.path.value]];

  const missing: Locale[] = [];
  const labelFiles: Partial<Record<Locale, string>> = {};

  await Promise.all(
    pairs.map(async ([locale, { absolutePath }]) => {
      await exists(absolutePath)
        .then(() => readFile(absolutePath, 'utf-8'))
        .then(content => (labelFiles[locale] = content))
        .catch(() => {
          missing.push(locale);
        });
    })
  );

  if (missing.length > 0) {
    throw new Error(`Missing label files for locales: ${missing.join(', ')}`);
  }

  return transformer.parseAggregate(labelFiles, options);
}

export async function updateLocalLabelFile(
  config: Config,
  dataset: TranslationDataset
): Promise<void> {
  const sortedDataset = fromEntries(
    entries(dataset).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
  );
  const transformer = defaultTransformerSet.getByFormat(config.format);
  const serialized = transformer.serialize(sortedDataset, {
    referenceLocale: config.referenceLocale,
    locales: config.locales,
  });

  await Promise.all(
    serialized.map(serializedFile => createFile(config, serializedFile))
  );
}

function resolvePath(
  config: Config,
  serializedFile: SerializationFile
): string {
  const { locale, filePath } = serializedFile;

  if (config.path.ref === 'single') {
    return path.join(config.rootDir, filePath);
  }

  if (isNil(locale)) {
    throw new Error(
      `Missing locale for serialized file: ${serializedFile.filePath}`
    );
  }
  const localePath = config.path.value[locale];
  if (isNil(localePath)) {
    throw new Error(
      `Missing config for locale: ${locale} in serialized file: ${serializedFile.filePath}`
    );
  }

  return localePath.absolutePath;
}

async function createFile(
  config: Config,
  file: SerializationFile
): Promise<void> {
  const absolutePath = resolvePath(config, file);
  if (absolutePath.includes(path.sep)) {
    // Create dir
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  }
  await fs.writeFile(absolutePath, file.content, { encoding: 'utf-8' });
}

async function exists(path: string): Promise<boolean> {
  return fs.access(path, fs.constants.F_OK).then(() => true);
}
