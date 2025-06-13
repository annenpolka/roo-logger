import { z } from 'zod'

// Activity types enum
export const ActivityTypeEnum = z.enum([
  'command_execution',
  'code_generation', 
  'file_operation',
  'error_encountered',
  'decision_made',
  'conversation'
])

// Log levels enum
export const LogLevelEnum = z.enum(['debug', 'info', 'warn', 'error'])

// log_activity tool schema
export const LogActivitySchema = z.object({
  type: ActivityTypeEnum,
  summary: z.string().min(1),
  intention: z.string().min(1),
  context: z.string().min(1),
  logsDir: z.string().min(1),
  level: LogLevelEnum.optional().default('info'),
  details: z.record(z.any()).optional(),
  parentId: z.string().optional(),
  sequence: z.number().min(0).optional(),
  relatedIds: z.array(z.string()).optional()
})

// get_log_files tool schema
export const GetLogFilesSchema = z.object({
  logsDir: z.string().min(1),
  limit: z.number().min(1).max(1000).optional().default(10),
  offset: z.number().min(0).optional().default(0),
  logFilePrefix: z.string().optional().default('roo-activity-'),
  logFileExtension: z.string().optional().default('.json'),
  maxDepth: z.number().min(1).max(10).optional().default(3)
})

// search_logs tool schema
export const SearchLogsSchema = z.object({
  logsDir: z.string().min(1),
  logFilePrefix: z.string().optional().default('roo-activity-'),
  logFileExtension: z.string().optional().default('.json'),
  type: ActivityTypeEnum.optional(),
  level: LogLevelEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  searchText: z.string().optional(),
  limit: z.number().min(1).max(1000).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  parentId: z.string().optional(),
  sequenceFrom: z.number().min(0).optional(),
  sequenceTo: z.number().min(0).optional(),
  relatedId: z.string().optional(),
  relatedIds: z.array(z.string()).optional()
})

// Type inference
export type LogActivityInput = z.infer<typeof LogActivitySchema>
export type GetLogFilesInput = z.infer<typeof GetLogFilesSchema>
export type SearchLogsInput = z.infer<typeof SearchLogsSchema>