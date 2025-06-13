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
  details?: any
  parentId?: string
  sequence?: number
  relatedIds?: string[]
}

export const validateActivityLogInput = (input: any): Result<ActivityLogInput, ValidationError> => {
  if (!input || typeof input !== 'object') {
    return failure(new ValidationError('入力は有効なオブジェクトである必要があります'))
  }

  // 必須フィールドの検証
  const typeResult = validateRequiredString(input.type, 'type')
  if (typeResult.type === 'failure') return typeResult

  if (!isValidActivityType(input.type)) {
    return failure(new ValidationError('無効なアクティビティタイプです', 'type'))
  }

  const summaryResult = validateRequiredString(input.summary, 'summary')
  if (summaryResult.type === 'failure') return summaryResult

  const intentionResult = validateRequiredString(input.intention, 'intention')
  if (intentionResult.type === 'failure') return intentionResult

  const contextResult = validateRequiredString(input.context, 'context')
  if (contextResult.type === 'failure') return contextResult

  const logsDirResult = validateAbsolutePath(input.logsDir)
  if (logsDirResult.type === 'failure') {
    return failure(new ValidationError(logsDirResult.error.message, 'logsDir'))
  }

  // オプションフィールドの検証
  if (input.level !== undefined && !isValidLogLevel(input.level)) {
    return failure(new ValidationError('無効なログレベルです', 'level'))
  }

  if (input.sequence !== undefined && (typeof input.sequence !== 'number' || input.sequence < 0)) {
    return failure(new ValidationError('sequenceは0以上の数値である必要があります', 'sequence'))
  }

  if (input.relatedIds !== undefined && !Array.isArray(input.relatedIds)) {
    return failure(new ValidationError('relatedIdsは文字列の配列である必要があります', 'relatedIds'))
  }

  return success({
    type: input.type,
    summary: input.summary,
    intention: input.intention,
    context: input.context,
    logsDir: input.logsDir,
    level: input.level,
    details: input.details,
    parentId: input.parentId,
    sequence: input.sequence,
    relatedIds: input.relatedIds
  })
}