import { entries } from '@/core/type-utils';
import { type Config } from '@/project/labeleer-config';
import {
  defaultTransformerSet,
  type LanguageFileTransformer,
  type Locale,
  type ParsingOptions,
  type TranslationDataset,
} from '@labeleer/translation-dataset-transformers';
import { readFile, writeFile } from 'fs/promises';
import fs from 'node:fs';

export async function readLocalLabelFiles(
  config: Config
): Promise<TranslationDataset> {
  const transformer = defaultTransformerSet.getByFormat(config.format);
  const options: ParsingOptions = { referenceLocale: config.referenceLocale };

  if (config.path) {
    return readSingular(transformer, config.path, options);
  }

  return readAggregate(transformer, config.paths ?? {}, options);
}

async function readSingular(
  transformer: LanguageFileTransformer<any, any, any>,
  path: string,
  options: ParsingOptions
): Promise<TranslationDataset> {
  return exists(path)
    .then(() => readFile(path, 'utf-8'))
    .then(content => transformer.parse(content, options));
}

async function readAggregate(
  transformer: LanguageFileTransformer<any, any, any>,
  paths: Partial<Record<Locale, string>>,
  options: ParsingOptions
): Promise<TranslationDataset> {
  const pairs = entries(paths ?? {}) as [Locale, string][];
  const missing: Locale[] = [];
  const labelFiles: Partial<Record<Locale, string>> = {};

  await Promise.all(
    pairs.map(async ([locale, path]) => {
      await exists(path)
        .then(() => readFile(path, 'utf-8'))
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
  const transformer = defaultTransformerSet.getByFormat(config.format);
  const serialized = transformer.serialize(dataset, {
    referenceLocale: config.referenceLocale ?? config.locales[0],
    locales: config.locales,
  });

  await Promise.all(
    entries(serialized).map(([path, file]) =>
      writeFile(path, file.content, { encoding: 'utf-8' })
    )
  );
}

async function exists(path: string): Promise<boolean> {
  return fs.promises.access(path, fs.constants.F_OK).then(() => true);
}
