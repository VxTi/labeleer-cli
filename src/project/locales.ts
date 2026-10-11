import {
  isNonEmptyArray,
  type NonEmptyArray,
  type Nullable,
} from '@/core/type-utils';
import { labeleer, type LanguageItem } from '@labeleer/api';

export async function getLanguages(
  projectId: string,
  accessToken: string
): Promise<Nullable<NonEmptyArray<LanguageItem>>> {
  const { data } = await labeleer.project.translations.locales.get({
    query: { projectId },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!isNonEmptyArray(data?.data)) return;
  return data?.data;
}
