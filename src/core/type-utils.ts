import { isNil } from 'lodash-es';

export function entries<TKey extends string, TValue>(
  input: Record<TKey, TValue>
): [TKey, TValue][];
export function entries<TKey extends string, TValue>(
  input: Partial<Record<TKey, Nullable<TValue>>>
): [TKey, Nullable<TValue>][];
export function entries<TKey extends string, TValue>(
  input: Partial<Record<TKey, Nullable<TValue>>>
): [TKey, Nullable<TValue>][] {
  return Object.entries(input) as [TKey, TValue][];
}

export function keys<TKey extends string>(
  input: Record<TKey, unknown> | Partial<Record<TKey, unknown>>
): TKey[] {
  return Object.keys(input) as TKey[];
}

export function fromEntries<K extends string, V>(
  entries: [K, Nullable<V>][]
): Partial<Record<K, V>>;
export function fromEntries<K extends string, V>(
  entries: [K, V][]
): Record<K, V>;
export function fromEntries<K extends string, V>(
  entries: [K, Nullable<V>][]
): Partial<Record<K, V>> {
  return Object.fromEntries(entries) as Record<K, V>;
}

export type Prettify<T> = {
  [K in keyof T as PropertyKey extends K ? never : K]: T[K];
} & {};

export type Nullish = undefined | null;
export type Nullable<T> = T | Nullish;

export type ExpandConstArrayExcl<T, N extends number> = N extends 5
  ? [T, T, T, T, T]
  : N extends 4
    ? [T, T, T, T]
    : N extends 3
      ? [T, T, T]
      : N extends 2
        ? [T, T]
        : N extends 1
          ? [T]
          : N extends 0
            ? EmptyArray<T>
            : T[];

export type ExpandConstArrayIncl<T, N extends number> = [
  ...ExpandConstArrayExcl<T, N>,
  ...T[],
];

export function hasArrayLengthAtLeast<T, N extends number>(
  arr: T[],
  n: N
): arr is ExpandConstArrayIncl<T, N> {
  return arr.length === n;
}

export function hasArrayLength<T, N extends number>(
  arr: Nullable<T[]>,
  n: N
): arr is ExpandConstArrayExcl<T, N> {
  return !isNil(arr) && arr.length === n;
}

// Type safe map for arrays with statically known sizes
type MaybeReadonlyArray<T> = T[] | Readonly<T[]>;
type Iterator<TIn extends MaybeReadonlyArray<unknown>, Res> = (
  item: TIn[number]
) => Res;

export function mapConstantArray<
  T extends
    | ExpandConstArrayIncl<unknown, 4>
    | Readonly<ExpandConstArrayIncl<unknown, 4>>,
  Res,
>(arr: T, iterator: Iterator<T, Res>): ExpandConstArrayIncl<Res, 4>;
export function mapConstantArray<
  T extends
    | ExpandConstArrayIncl<unknown, 3>
    | Readonly<ExpandConstArrayIncl<unknown, 3>>,
  Res,
>(arr: T, iterator: Iterator<T, Res>): ExpandConstArrayIncl<Res, 3>;
export function mapConstantArray<
  T extends
    | ExpandConstArrayIncl<unknown, 2>
    | Readonly<ExpandConstArrayIncl<unknown, 2>>,
  Res,
>(arr: T, iterator: Iterator<T, Res>): ExpandConstArrayIncl<Res, 2>;
export function mapConstantArray<
  T extends
    | ExpandConstArrayIncl<unknown, 1>
    | Readonly<ExpandConstArrayIncl<unknown, 1>>,
  Res,
>(arr: T, iterator: Iterator<T, Res>): ExpandConstArrayIncl<Res, 1>;
export function mapConstantArray<
  T extends
    | ExpandConstArrayIncl<unknown, 0>
    | Readonly<ExpandConstArrayIncl<unknown, 0>>,
  Res,
>(arr: T, iterator: Iterator<T, Res>): EmptyArray<Res>;
export function mapConstantArray<
  T extends ExpandConstArrayIncl<unknown, number>,
  Res,
>(arr: T, iterator: Iterator<T, Res>): Res[] {
  return arr.map(iterator);
}

export type NonEmptyArray<T> = [T, ...T[]];
export type EmptyArray<T> = [] & T[];

export function isNonEmptyArray<T>(
  arr: Nullable<T[]>
): arr is NonEmptyArray<T> {
  return !isNil(arr) && arr.length > 0;
}
export function isEmptyArray<T>(arr: T[]): arr is EmptyArray<T> {
  return arr.length === 0;
}

export type Primitive = string | boolean | number;

export type ExcludeIndexSignature<T> = {
  [K in keyof T as K extends PropertyKey ? never : K]: T[K];
};

export function isNotNil<T>(input: Nullable<T>): input is T {
  return !isNil(input);
}

export type NonEmptyString = string & { readonly __tag: unique symbol };

export function toNonEmptyString(
  input: Nullable<string>
): NonEmptyString | undefined {
  return isNonEmptyString(input) ? input : undefined;
}

export function makeNonEmptyString(input: ''): string;
export function makeNonEmptyString(input: string): NonEmptyString;
export function makeNonEmptyString(input: string): NonEmptyString {
  return input as NonEmptyString;
}

export function isNonEmptyString(
  input: Nullable<string>,
  trim: boolean = false
): input is NonEmptyString {
  if (isNil(input)) return false;

  return trim ? input.trim().length > 0 : input.length > 0;
}
