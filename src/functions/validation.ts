import { Result, ok, err } from 'neverthrow'
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
    return err(new ValidationError('パスは空でない文字列である必要があります'))
  }

  if (!path.isAbsolute(pathValue)) {
    return err(new ValidationError('絶対パスを指定してください', 'path'))
  }

  return ok(pathValue)
}

export const validateRequiredString = (value: unknown, fieldName: string): Result<string, ValidationError> => {
  if (typeof value !== 'string') {
    return err(new ValidationError(`${fieldName}は文字列である必要があります`, fieldName))
  }

  if (value.trim() === '') {
    return err(new ValidationError(`${fieldName}は空でない文字列である必要があります`, fieldName))
  }

  return ok(value)
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

const validateObjectInput = (input: unknown): Result<Record<string, unknown>, ValidationError> => {
  if (!input || typeof input !== 'object') {
    return err(new ValidationError('入力は有効なオブジェクトである必要があります'))
  }
  return ok(input as Record<string, unknown>)
}

const validateOptionalFields = (inputRecord: Record<string, unknown>): Result<void, ValidationError> => {
  if (inputRecord.level !== undefined && !isValidLogLevel(inputRecord.level)) {
    return err(new ValidationError('無効なログレベルです', 'level'))
  }

  if (inputRecord.sequence !== undefined && (typeof inputRecord.sequence !== 'number' || inputRecord.sequence < 0)) {
    return err(new ValidationError('sequenceは0以上の数値である必要があります', 'sequence'))
  }

  if (inputRecord.relatedIds !== undefined && !Array.isArray(inputRecord.relatedIds)) {
    return err(new ValidationError('relatedIdsは文字列の配列である必要があります', 'relatedIds'))
  }

  // relatedIdsの中身が文字列かチェック
  if (inputRecord.relatedIds !== undefined && Array.isArray(inputRecord.relatedIds)) {
    for (const id of inputRecord.relatedIds) {
      if (typeof id !== 'string') {
        return err(new ValidationError('relatedIdsの要素はすべて文字列である必要があります', 'relatedIds'))
      }
    }
  }

  // detailsが存在する場合はオブジェクトかチェック
  if (inputRecord.details !== undefined && (typeof inputRecord.details !== 'object' || inputRecord.details === null)) {
    return err(new ValidationError('detailsはオブジェクトである必要があります', 'details'))
  }

  return ok(undefined)
}

export const validateActivityLogInput = (input: unknown): Result<ActivityLogInput, ValidationError> => {
  return validateObjectInput(input)
    .andThen((inputRecord) => {
      // 必須フィールドの検証をチェーン化
      return validateRequiredString(inputRecord.type, 'type')
        .andThen((type) => {
          if (!isValidActivityType(type)) {
            return err(new ValidationError('無効なアクティビティタイプです', 'type'))
          }
          return ok(type as ActivityType)
        })
        .andThen((type) => 
          validateRequiredString(inputRecord.summary, 'summary')
            .map((summary) => ({ type, summary }))
        )
        .andThen(({ type, summary }) => 
          validateRequiredString(inputRecord.intention, 'intention')
            .map((intention) => ({ type, summary, intention }))
        )
        .andThen(({ type, summary, intention }) => 
          validateRequiredString(inputRecord.context, 'context')
            .map((context) => ({ type, summary, intention, context }))
        )
        .andThen(({ type, summary, intention, context }) => 
          validateAbsolutePath(inputRecord.logsDir)
            .mapErr((error) => new ValidationError(error.message, 'logsDir'))
            .map((logsDir) => ({ type, summary, intention, context, logsDir }))
        )
        .andThen((validatedRequired) => 
          validateOptionalFields(inputRecord)
            .map(() => ({
              ...validatedRequired,
              level: inputRecord.level as LogLevel | undefined,
              details: inputRecord.details as Record<string, unknown> | undefined,
              parentId: inputRecord.parentId as string | undefined,
              sequence: inputRecord.sequence as number | undefined,
              relatedIds: inputRecord.relatedIds as string[] | undefined
            }))
        )
    })
}