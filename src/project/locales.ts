import { Err, Ok, type Result } from '@/core/result';
import { ProjectReadFailure } from '@/project/config/common';
import { labeleer, type LanguageItem } from '@labeleer/api';

export async function getLanguages(
  accessToken: string,
  projectId: string
): Promise<Result<LanguageItem[], ProjectReadFailure>> {
  const { data, error } = await labeleer.project.translations.locales.get({
    query: { projectId },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (error) {
    return Err(ProjectReadFailure.NETERR_LOCALES);
  }
  return Ok(data.data);
}
