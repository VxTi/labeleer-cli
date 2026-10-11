import { entries } from '@/core/type-utils';
import { type Config } from '@/project/labeleer-config';
import {
  defaultTransformerSet,
  type TranslationDataset,
} from '@labeleer/translation-dataset-transformers';
import { writeFile } from 'fs/promises';

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
