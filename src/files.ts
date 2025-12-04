import { getFormatForExtension, type SupportedFormat } from '@labeleer/models';

export function toRelativePath(absolutePath: string): string {
  return absolutePath.replace(process.cwd(), '.');
}

export function inferFileFormatFromFileName(
  labelFilePath: string
): SupportedFormat | undefined {
  const extension = labelFilePath.split('.').pop();

  if (!extension) return undefined;

  return getFormatForExtension(extension);
}
