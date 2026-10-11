import { FileFormat } from '@labeleer/translation-dataset-transformers';

export function getFileNameForFormat(format: FileFormat): string {
  switch (format) {
    case LanguageFileFormat.ANDROID_STRINGS:
      return 'Android Strings (.xml)';
    case LanguageFileFormat.APPLE_STRINGS:
      return 'Apple Strings (.strings)';
    case LanguageFileFormat.JSON:
      return 'JSON (.json)';
    case LanguageFileFormat.PO:
      return 'Gettext PO (.po)';
    case LanguageFileFormat.TS:
      return 'Qt Linguist (.ts)';
    case LanguageFileFormat.XLIFF:
      return 'XLIFF (.xliff)';
    case LanguageFileFormat.YAML:
      return 'YAML (.yaml/.yml)';
    case LanguageFileFormat.XCSTRINGS:
      return 'XCStrings (.xcstrings)';
  }
}
