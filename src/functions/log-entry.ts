import { ActivityLog, LogLevel } from '../types/core.js'
import { ActivityLogInput } from './validation.js'
import { randomUUID } from 'crypto'
import { saveActivityLog } from './file-io.js'
import { LogActivityInput } from '../schemas/zod-schemas.js'

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

// New API compatible logActivity function
export const logActivity = async (input: LogActivityInput): Promise<{
  success: boolean
  logId: string
  filePath: string
}> => {
  // Convert Zod input to ActivityLogInput
  const activityInput: ActivityLogInput = {
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
  }

  const log = createActivityLog(activityInput)
  const result = await saveActivityLog(log, input.logsDir)
  
  if (result.type === 'failure') {
    throw new Error(result.error.message)
  }

  return {
    success: true,
    logId: log.id,
    filePath: result.value
  }
}