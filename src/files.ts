import {
  getFormatForExtension,
  type LanguageFileFormat,
} from '@labeleer/translation-dataset-transformers';

export function toRelativePath(absolutePath: string): string {
  return absolutePath.replace(process.cwd(), '.');
}

export function inferFileFormatFromFileName(
  labelFilePath: string
): LanguageFileFormat | undefined {
  const extension = labelFilePath.split('.').pop();

  if (!extension) return undefined;

  return getFormatForExtension(`.${extension}`);
}
