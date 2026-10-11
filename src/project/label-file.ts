import { entries, fromEntries } from '@/core/type-utils';
import { type Config } from '@/project/labeleer-config';
import {
  defaultTransformerSet,
  type Locale,
  type ParsingOptions,
  type TranslationDataset,
} from '@labeleer/translation-dataset-transformers';
import { readFile, writeFile } from 'fs/promises';

export async function readLocalLabelFiles(
  config: Config
): Promise<TranslationDataset> {
  const transformer = defaultTransformerSet.getByFormat(config.format);
  const options: ParsingOptions = { referenceLocale: config.referenceLocale };

  if (config.path) {
    const content = await readFile(config.format, 'utf-8');

    return transformer.parse(content, options as never);
  }

  const labelFiles = await Promise.all(
    entries(config.paths ?? {}).map(
      async ([locale, path]): Promise<[Locale, string]> => [
        locale,
        await readFile(path!, 'utf-8'),
      ]
    )
  );

  return transformer.parseAggregate(fromEntries(labelFiles), options as never);
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
