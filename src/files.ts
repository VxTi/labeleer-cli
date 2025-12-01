export const supportedFileFormats = ['json', 'yaml', 'xml'] as const;
export type SupportedFileFormat = (typeof supportedFileFormats)[number];

export function toRelativePath(absolutePath: string): string {
  return absolutePath.replace(process.cwd(), '.');
}

export function inferFileFormatFromFileName(
  labelFilePath: string
): SupportedFileFormat | undefined {
  return supportedFileFormats.find(ext => labelFilePath.endsWith(`.${ext}`));
}
