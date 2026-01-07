export interface SuccessResult<TOutput> {
  success: true;
  value: TOutput;
}

export interface ErrorResult {
  success: false;
  error: string;
}

export type Result<TOutput> = SuccessResult<TOutput> | ErrorResult;

export function Ok<T>(value: T): SuccessResult<T> {
  return { success: true, value };
}

export function Err(error: string): ErrorResult {
  return { success: false, error };
}
