import { Err, Ok, type Result } from '@/core/result';
import { labeleer } from '@labeleer/api';
import type { TranslationDataset } from '@labeleer/translation-dataset-transformers';

export async function getTranslationDataset(
  accessToken: string,
  projectId: string
): Promise<Result<TranslationDataset>> {
  const set: TranslationDataset = {};

  const pageSize = 100;
  let offset = 0;

  while (true) {
    const { data, error } = await labeleer.project.translations.get({
      query: { projectId, limit: `${pageSize}`, offset: `${offset}` },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (error) {
      return Err(error.error);
    }

    offset += pageSize;

    data.data.forEach(item => {
      set[item.key] = {
        translations: item.translations,
        description: item.description ?? undefined,
        ...(item.tags.length > 0 && { tags: item.tags }),
        ...(Object.keys(item.plurals).length > 0 && { plurals: item.plurals }),
      };
    });

    if (!data.pagination.has_next) break;
  }

  return Ok(set);
}
