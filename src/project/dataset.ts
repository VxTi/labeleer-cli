import { fromEntries, type Nullable } from '@/core/type-utils';
import type { Config } from '@/project/labeleer-config';
import { labeleer, type TranslationItem } from '@labeleer/api';
import type { TranslationDataset } from '@labeleer/translation-dataset-transformers';

export async function getTranslationDataset({
  projectId,
  accessToken,
}: Config): Promise<Nullable<TranslationDataset>> {
  const items: TranslationItem[] = [];

  const pageSize = 100;
  let offset = 0;
  while (true) {
    const { data } = await labeleer.project.translations.get({
      query: { projectId, limit: `${pageSize}`, offset: `${offset}` },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!data?.data) break;

    offset += pageSize;

    items.push(...data.data);
    if (items.length >= data.pagination.totalCount) break;
  }
  return fromEntries(
    items.map(item => [
      item.key,
      {
        translations: item.translations,
        tags: item.tags,
        description: item.description,
        plurals: item.plurals,
      },
    ])
  );
}
