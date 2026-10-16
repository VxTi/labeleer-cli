import {
  isNonEmptyArray,
  isNonEmptyString,
  type NonEmptyArray,
} from '@/core/type-utils';
import { search, select } from '@inquirer/prompts';
import {
  getLocaleName,
  type Locale,
  Locales,
} from '@labeleer/translation-dataset-transformers';
import { isNil } from 'lodash-es';

export async function inquireCreateLocales(): Promise<
  NonEmptyArray<Locale> | undefined
> {
  const locales: Locale[] = [];

  for (;;) {
    const createNew = await select({
      message: 'Would you like to add a new language?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
    });
    if (!createNew) break;

    const baselineValues = Locales.filter(l => !locales.includes(l)).map(
      (loc: Locale) => ({
        name: getLocaleName(loc),
        value: loc,
      })
    );

    const locale: Locale = await search({
      message: 'Which language would you like to add?',
      source: (input: string | undefined) => {
        if (isNil(input)) return baselineValues;
        return baselineValues.filter(
          value =>
            value.name.toLowerCase().includes(input.toLowerCase()) ||
            containsCharsInOrder(value.name, input)
        );
      },
    });
    locales.push(locale);
  }

  return isNonEmptyArray(locales) ? locales : undefined;
}

export function containsCharsInOrder(text: string, query: string): boolean {
  if (!isNonEmptyString(text) || !isNonEmptyString(query)) return false;

  let textIndex: number = 0;
  let queryIndex: number = 0;

  while (textIndex < text.length && queryIndex < query.length) {
    if (text[textIndex] === query[queryIndex]) {
      queryIndex++;
    }
    textIndex++;
  }

  return queryIndex === query.length;
}
