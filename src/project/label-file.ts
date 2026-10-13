import { entries } from '@/core/type-utils';
import type { AbsolutePath, Config, RelativePath } from './config';
import {
  defaultTransformerSet,
  type LanguageFileTransformer,
  type Locale,
  type ParsingOptions,
  type TranslationDataset,
} from '@labeleer/translation-dataset-transformers';
import { readFile, writeFile } from 'fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { thru } from 'lodash-es';

export async function readLocalLabelFiles(
  config: Config
): Promise<TranslationDataset> {
  const transformer = defaultTransformerSet.getByFormat(config.format);
  const options: ParsingOptions = { referenceLocale: config.referenceLocale };

  return readAggregate(config, transformer, config.paths, options);
}

async function readAggregate(
  config: Config,
  transformer: LanguageFileTransformer<any, any, any>,
  paths: Partial<Record<Locale, RelativePath>>,
  options: ParsingOptions
): Promise<TranslationDataset> {
  const pairs = entries(paths) as [Locale, RelativePath][];
  const missing: Locale[] = [];
  const labelFiles: Partial<Record<Locale, string>> = {};

  await Promise.all(
    pairs.map(async ([locale, relativePath]) => {
      const absolutePath: AbsolutePath = path.resolve(
        config.rootDir,
        relativePath
      );
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
  const transformer = defaultTransformerSet.getByFormat(config.format);
  const serialized = transformer.serialize(dataset, {
    referenceLocale: config.referenceLocale,
    locales: config.locales,
  });

  await Promise.all(
    entries(serialized).map(([path, file]) =>
      thru(resolvePath(config, path), absolutePath =>
        exists(absolutePath).then(() =>
          writeFile(absolutePath, file.content, { encoding: 'utf-8' })
        )
      )
    )
  );
}

function resolvePath(config: Config, serializedPath: string): string {
  return path.join(config.rootDir, serializedPath);
}

async function exists(path: string): Promise<boolean> {
  return fs.promises.access(path, fs.constants.F_OK).then(() => true);
}
