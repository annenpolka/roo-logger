// Re-export neverthrow types for backward compatibility
import { Result as NeverthrowResult, ResultAsync as NeverthrowResultAsync, ok as neverthrowOk, err as neverthrowErr } from 'neverthrow'

export { NeverthrowResult as Result, NeverthrowResultAsync as ResultAsync, neverthrowOk as ok, neverthrowErr as err }

// For migration compatibility, alias neverthrow's constructors
export const success = neverthrowOk
export const failure = neverthrowErr

// Type guards using neverthrow's methods
export const isSuccess = <T, E>(result: NeverthrowResult<T, E>): result is NeverthrowResult<T, E> & { isOk(): true } =>
  result.isOk()

export const isFailure = <T, E>(result: NeverthrowResult<T, E>): result is NeverthrowResult<T, E> & { isErr(): true } =>
  result.isErr()