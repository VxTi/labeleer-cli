export interface SuccessResult<TOutput> {
  ok: true;
  value: TOutput;
}

export interface ErrorResult<T = string> {
  ok: false;
  error: T;
}

export interface ErrorStack<T extends string> {
  type: T;
  message: string;
}

export type Result<TOutput, TErr = string> =
  | SuccessResult<TOutput>
  | ErrorResult<TErr>;

export function Ok<T>(value: T): SuccessResult<T> {
  return { ok: true, value };
}

export function Err<T = string>(error: T): ErrorResult<T> {
  return { ok: false, error };
}
