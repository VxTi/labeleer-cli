import { SupportedFormat } from '@labeleer/translation-dataset-transformers';

export function getFileNameForFormat(format: SupportedFormat): string {
  switch (format) {
    case SupportedFormat.ANDROID_STRINGS:
      return 'Android Strings (.xml)';
    case SupportedFormat.APPLE_STRINGS:
      return 'Apple Strings (.strings)';
    case SupportedFormat.JSON:
      return 'JSON (.json)';
    case SupportedFormat.PO:
      return 'Gettext PO (.po)';
    case SupportedFormat.TS:
      return 'Qt Linguist (.ts)';
    case SupportedFormat.XLIFF:
      return 'XLIFF (.xliff)';
    case SupportedFormat.YAML:
      return 'YAML (.yaml/.yml)';
    case SupportedFormat.XCSTRINGS:
      return 'XCStrings (.xcstrings)';
  }
}
