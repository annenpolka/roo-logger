import { ActivityLog, LogLevel } from '../types/core.js'
import { ActivityLogInput } from './validation.js'
import { randomUUID } from 'crypto'

export const generateId = (): string => {
  return randomUUID()
}

export const generateTimestamp = (): string => {
  return new Date().toISOString()
}

export const createActivityLog = (input: ActivityLogInput): ActivityLog => {
  // 一般的なアプローチ：オブジェクトスプレッドで一度に構築
  const log: ActivityLog = Object.freeze({
    id: generateId(),
    timestamp: generateTimestamp(),
    type: input.type,
    level: (input.level || 'info') as LogLevel,
    summary: input.summary,
    intention: input.intention,
    context: input.context,
    // オプションフィールドは条件付きスプレッド
    ...(input.details !== undefined && { details: input.details }),
    ...(input.parentId !== undefined && { parentId: input.parentId }),
    ...(input.sequence !== undefined && { sequence: input.sequence }),
    ...(input.relatedIds !== undefined && { 
      relatedIds: [...input.relatedIds] as readonly string[] 
    })
  })

  return log
}