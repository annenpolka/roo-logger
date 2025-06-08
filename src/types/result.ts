export type Result<T, E = Error> = 
  | { type: 'success'; value: T }
  | { type: 'failure'; error: E }

export const success = <T>(value: T): Result<T> => ({
  type: 'success',
  value
})

export const failure = <E = Error>(error: E): Result<never, E> => ({
  type: 'failure',
  error
})

export const isSuccess = <T, E>(result: Result<T, E>): result is { type: 'success'; value: T } =>
  result.type === 'success'

export const isFailure = <T, E>(result: Result<T, E>): result is { type: 'failure'; error: E } =>
  result.type === 'failure'