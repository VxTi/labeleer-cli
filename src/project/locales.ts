import { Err, Ok, type Result } from '@/core/result';
import { isNonEmptyArray, type NonEmptyArray } from '@/core/type-utils';
import { labeleer, type LanguageItem } from '@labeleer/api';

export async function getLanguages(
  accessToken: string,
  projectId: string
): Promise<Result<NonEmptyArray<LanguageItem>>> {
  const { data, error } = await labeleer.project.translations.locales.get({
    baseUrl: 'https://labeleer.com',
    query: { projectId },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (error || !isNonEmptyArray(data?.data)) {
    return Err(error?.details ?? 'No locales available');
  }
  return Ok(data?.data);
}
