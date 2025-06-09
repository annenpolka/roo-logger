import { Result, success, failure } from '../types/result.js'
import { isValidActivityType, isValidLogLevel, ActivityType, LogLevel } from '../types/core.js'
import path from 'path'

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export const validateAbsolutePath = (pathValue: unknown): Result<string, ValidationError> => {
  if (typeof pathValue !== 'string' || pathValue.trim() === '') {
    return failure(new ValidationError('パスは空でない文字列である必要があります'))
  }

  if (!path.isAbsolute(pathValue)) {
    return failure(new ValidationError('絶対パスを指定してください', 'path'))
  }

  return success(pathValue)
}

export const validateRequiredString = (value: unknown, fieldName: string): Result<string, ValidationError> => {
  if (typeof value !== 'string') {
    return failure(new ValidationError(`${fieldName}は文字列である必要があります`, fieldName))
  }

  if (value.trim() === '') {
    return failure(new ValidationError(`${fieldName}は空でない文字列である必要があります`, fieldName))
  }

  return success(value)
}

export interface ActivityLogInput {
  type: ActivityType
  summary: string
  intention: string
  context: string
  logsDir: string
  level?: LogLevel
  details?: Record<string, unknown>
  parentId?: string
  sequence?: number
  relatedIds?: string[]
}

export const validateActivityLogInput = (input: unknown): Result<ActivityLogInput, ValidationError> => {
  if (!input || typeof input !== 'object') {
    return failure(new ValidationError('入力は有効なオブジェクトである必要があります'))
  }

  const inputRecord = input as Record<string, unknown>

  // 必須フィールドの検証
  const typeResult = validateRequiredString(inputRecord.type, 'type')
  if (typeResult.type === 'failure') return typeResult

  if (!isValidActivityType(inputRecord.type)) {
    return failure(new ValidationError('無効なアクティビティタイプです', 'type'))
  }

  const summaryResult = validateRequiredString(inputRecord.summary, 'summary')
  if (summaryResult.type === 'failure') return summaryResult

  const intentionResult = validateRequiredString(inputRecord.intention, 'intention')
  if (intentionResult.type === 'failure') return intentionResult

  const contextResult = validateRequiredString(inputRecord.context, 'context')
  if (contextResult.type === 'failure') return contextResult

  const logsDirResult = validateAbsolutePath(inputRecord.logsDir)
  if (logsDirResult.type === 'failure') {
    return failure(new ValidationError(logsDirResult.error.message, 'logsDir'))
  }

  // オプションフィールドの検証
  if (inputRecord.level !== undefined && !isValidLogLevel(inputRecord.level)) {
    return failure(new ValidationError('無効なログレベルです', 'level'))
  }

  if (inputRecord.sequence !== undefined && (typeof inputRecord.sequence !== 'number' || inputRecord.sequence < 0)) {
    return failure(new ValidationError('sequenceは0以上の数値である必要があります', 'sequence'))
  }

  if (inputRecord.relatedIds !== undefined && !Array.isArray(inputRecord.relatedIds)) {
    return failure(new ValidationError('relatedIdsは文字列の配列である必要があります', 'relatedIds'))
  }

  return success({
    type: typeResult.value as ActivityType,
    summary: summaryResult.value,
    intention: intentionResult.value,
    context: contextResult.value,
    logsDir: logsDirResult.value,
    level: inputRecord.level as LogLevel | undefined,
    details: inputRecord.details as Record<string, unknown> | undefined,
    parentId: inputRecord.parentId as string | undefined,
    sequence: inputRecord.sequence as number | undefined,
    relatedIds: inputRecord.relatedIds as string[] | undefined
  })
}