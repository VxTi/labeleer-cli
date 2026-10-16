import { entries, fromEntries } from '@/core/type-utils';
import type { Config, LabeleerFile } from './config/common';
import {
  defaultTransformerSet,
  type Locale,
  type ParsingOptions,
  type TranslationDataset,
} from '@labeleer/translation-dataset-transformers';
import { readFile, writeFile } from 'fs/promises';
import fs from 'node:fs';
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
    entries(serialized).map(([path, file]) =>
      writeFile(resolvePath(config, path), file.content, {
        encoding: 'utf-8',
      })
    )
  );
}

function resolvePath(config: Config, serializedPath: string): string {
  return path.join(config.rootDir, serializedPath);
}

async function exists(path: string): Promise<boolean> {
  return fs.promises.access(path, fs.constants.F_OK).then(() => true);
}
