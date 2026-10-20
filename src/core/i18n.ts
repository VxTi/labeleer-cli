import type {
  Plurality,
  TranslationDataset,
  TranslationEntry,
} from '@labeleer/translation-dataset-transformers';
import { type Nullable, isNil } from '@vxti/typed';
import translations from './labels.json';

const typed = translations satisfies TranslationDataset;

type LabelKey = keyof typeof translations;
type Locale =
  keyof (typeof translations)[keyof typeof translations]['translations'];
export type LabelArg = string | number | boolean;

const defaultLocale = 'en_US' satisfies Locale;

interface InternalTranslationProps {
  label: LabelKey;
  plurality?: Plurality;
  args?: LabelArg[];
}

export function translate({
  label,
  plurality,
  args,
}: InternalTranslationProps): string {
  const labelEntry = typed[label] as Nullable<TranslationEntry>;
  const locale = defaultLocale;
  const nonPluralized = labelEntry?.translations[locale];
  const entry: string | undefined =
    (!isNil(plurality)
      ? labelEntry?.plurals?.[locale]?.[plurality]
      : undefined) ?? nonPluralized;

  if (isNil(entry)) return label;

  return format(entry, args ?? []);
}

function format(text: string, args: LabelArg[]): string {
  return text.replace(/{(\d+)}/g, (match, numberStr) => {
    const index = Number(numberStr);

    if (index >= args.length) return match;

    return String(args[index]);
  });
}
