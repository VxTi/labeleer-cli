import { Err, Ok, type Result } from '@/core/result';
import { labeleer, type LanguageItem } from '@labeleer/api';

export async function getLanguages(
  accessToken: string,
  projectId: string
): Promise<Result<LanguageItem[]>> {
  const { data, error } = await labeleer.project.translations.locales.get({
    query: { projectId },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (error) {
    return Err(error.details ?? error.error);
  }
  return Ok(data.data);
}
