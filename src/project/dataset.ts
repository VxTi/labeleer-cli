import type { TranslationDataset } from '@labeleer/translation-dataset-transformers';
import { ProjectReadFailure } from '@/project/config/common';
import { Err, Ok, type Result } from '@/core/result';
import { labeleer } from '@labeleer/api';

export async function getTranslationDataset(
  accessToken: string,
  projectId: string
): Promise<Result<TranslationDataset, ProjectReadFailure>> {
  const set: TranslationDataset = {};

  const pageSize = 100;
  let offset = 0;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const { data, error } = await labeleer.project.translations.get({
      query: { projectId, limit: `${pageSize}`, offset: `${offset}` },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (error) {
      return Err(ProjectReadFailure.NETERR_TRANSLATIONS);
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
