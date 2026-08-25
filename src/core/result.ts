export interface SuccessResult<TOutput> {
  ok: true;
  value: TOutput;
}

export interface ErrorResult {
  ok: false;
  error: string;
}

export type Result<TOutput> = SuccessResult<TOutput> | ErrorResult;

export function Ok<T>(value: T): SuccessResult<T> {
  return { ok: true, value };
}

export function Err(error: string): ErrorResult {
  return { ok: false, error };
}
