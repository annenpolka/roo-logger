export const ACTIVITY_TYPES = [
  'command_execution',
  'code_generation', 
  'file_operation',
  'error_encountered',
  'decision_made',
  'conversation'
] as const

export const LOG_LEVELS = [
  'debug',
  'info', 
  'warn',
  'error'
] as const

export type ActivityType = typeof ACTIVITY_TYPES[number]
export type LogLevel = typeof LOG_LEVELS[number]

export interface ActivityLog {
  readonly id: string
  readonly timestamp: string
  readonly type: ActivityType
  readonly level: LogLevel
  readonly summary: string
  readonly intention: string
  readonly context: string
  readonly details?: any
  readonly parentId?: string
  readonly sequence?: number
  readonly relatedIds?: readonly string[]
}

export const isValidActivityType = (value: unknown): value is ActivityType =>
  typeof value === 'string' && ACTIVITY_TYPES.includes(value as ActivityType)

export const isValidLogLevel = (value: unknown): value is LogLevel =>
  typeof value === 'string' && LOG_LEVELS.includes(value as LogLevel)