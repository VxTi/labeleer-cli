import { type TranslationDataset } from '@labeleer/translation-dataset-transformers';
import translations from './labels.json';

const typed = translations satisfies TranslationDataset;

type LabelKey = keyof typeof translations;
type Locale =
  keyof (typeof translations)[keyof typeof translations]['translations'];

const defaultLocale = 'en_US' satisfies Locale;

export function translate(label: LabelKey): string {
  return typed[label]['translations'][defaultLocale];
}
