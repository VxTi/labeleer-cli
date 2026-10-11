import { defaultTransformerSet } from '@labeleer/translation-dataset-transformers';

export function toRelativePath(absolutePath: string): string {
  return absolutePath.replace(process.cwd(), '.');
}

export type FileTransformer = ReturnType<
  typeof defaultTransformerSet.getByExtension
> & {};

export function getTransformerFromFileName(
  labelFilePath: string
): FileTransformer | undefined {
  const extension = labelFilePath.split('.').pop();

  if (!extension) return undefined;

  return defaultTransformerSet.getByExtension(`.${extension}`);
}
