import { z } from 'zod'
import path from 'path'

// Zod schemas for validation
export const LogActivityArgsSchema = z.object({
  type: z.enum(['command_execution', 'code_generation', 'file_operation', 'error_encountered', 'decision_made', 'conversation']),
  summary: z.string().min(1, 'Summary is required'),
  intention: z.string().min(1, 'Intention is required'),
  context: z.string().min(1, 'Context is required'),
  logsDir: z.string().refine(p => path.isAbsolute(p), {
    message: "Must be an absolute path"
  }),
  level: z.enum(['debug', 'info', 'warn', 'error']).optional().default('info'),
  details: z.record(z.unknown()).optional(),
  parentId: z.string().optional(),
  sequence: z.number().min(0).optional(),
  relatedIds: z.array(z.string()).optional()
})

export const GetLogFilesArgsSchema = z.object({
  logsDir: z.string(),
  limit: z.number().positive().max(1000).default(10),
  offset: z.number().min(0).default(0),
  logFilePrefix: z.string().default('roo-activity-'),
  logFileExtension: z.string().default('.json'),
  maxDepth: z.number().positive().max(10).default(3)
})

export const SearchLogsArgsSchema = z.object({
  logsDir: z.string(),
  logFilePrefix: z.string().default('roo-activity-'),
  logFileExtension: z.string().default('.json'),
  type: z.enum(['command_execution', 'code_generation', 'file_operation', 'error_encountered', 'decision_made', 'conversation']).optional(),
  level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  searchText: z.string().optional(),
  limit: z.number().positive().max(1000).default(50),
  offset: z.number().min(0).default(0),
  parentId: z.string().optional(),
  sequenceFrom: z.number().min(0).optional(),
  sequenceTo: z.number().min(0).optional(),
  relatedId: z.string().optional(),
  relatedIds: z.array(z.string()).optional()
})

// TypeScript types generated from schemas
export type LogActivityArgs = z.infer<typeof LogActivityArgsSchema>
export type GetLogFilesArgs = z.infer<typeof GetLogFilesArgsSchema>
export type SearchLogsArgs = z.infer<typeof SearchLogsArgsSchema>

// JSON Schema definitions for MCP (generated from Zod schemas)
export const logActivityInputSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['command_execution', 'code_generation', 'file_operation', 'error_encountered', 'decision_made', 'conversation'],
      description: 'Type of activity being logged'
    },
    summary: {
      type: 'string',
      minLength: 1,
      description: 'Brief summary of the activity'
    },
    intention: {
      type: 'string',
      minLength: 1,
      description: 'Purpose or intention behind the activity'
    },
    context: {
      type: 'string',
      minLength: 1,
      description: 'Context information about the activity'
    },
    logsDir: {
      type: 'string',
      description: 'Absolute path to the logs directory'
    },
    level: {
      type: 'string',
      enum: ['debug', 'info', 'warn', 'error'],
      default: 'info',
      description: 'Log level for the activity'
    },
    details: {
      type: 'object',
      additionalProperties: true,
      description: 'Additional details about the activity'
    },
    parentId: {
      type: 'string',
      description: 'ID of the parent activity (for hierarchical logging)'
    },
    sequence: {
      type: 'number',
      minimum: 0,
      description: 'Sequence number for ordered activities'
    },
    relatedIds: {
      type: 'array',
      items: { type: 'string' },
      description: 'IDs of related activities'
    }
  },
  required: ['type', 'summary', 'intention', 'context', 'logsDir']
} as const

export const getLogFilesInputSchema = {
  type: 'object',
  properties: {
    logsDir: {
      type: 'string',
      description: 'Absolute path to the logs directory to search'
    },
    limit: {
      type: 'number',
      minimum: 1,
      maximum: 1000,
      default: 10,
      description: 'Maximum number of log files to return'
    },
    offset: {
      type: 'number',
      minimum: 0,
      default: 0,
      description: 'Number of log files to skip (for pagination)'
    },
    logFilePrefix: {
      type: 'string',
      default: 'roo-activity-',
      description: 'Prefix pattern for log file names'
    },
    logFileExtension: {
      type: 'string',
      default: '.json',
      description: 'File extension for log files'
    },
    maxDepth: {
      type: 'number',
      minimum: 1,
      maximum: 10,
      default: 3,
      description: 'Maximum directory depth to search'
    }
  },
  required: ['logsDir']
} as const

export const searchLogsInputSchema = {
  type: 'object',
  properties: {
    logsDir: {
      type: 'string',
      description: 'Absolute path to the logs directory to search'
    },
    logFilePrefix: {
      type: 'string',
      default: 'roo-activity-',
      description: 'Prefix pattern for log file names'
    },
    logFileExtension: {
      type: 'string',
      default: '.json',
      description: 'File extension for log files'
    },
    type: {
      type: 'string',
      enum: ['command_execution', 'code_generation', 'file_operation', 'error_encountered', 'decision_made', 'conversation'],
      description: 'Filter by activity type'
    },
    level: {
      type: 'string',
      enum: ['debug', 'info', 'warn', 'error'],
      description: 'Filter by log level'
    },
    startDate: {
      type: 'string',
      format: 'date-time',
      description: 'Filter logs from this date (ISO 8601 format)'
    },
    endDate: {
      type: 'string',
      format: 'date-time',
      description: 'Filter logs until this date (ISO 8601 format)'
    },
    searchText: {
      type: 'string',
      description: 'Search text in summary, intention, context, or details'
    },
    limit: {
      type: 'number',
      minimum: 1,
      maximum: 1000,
      default: 50,
      description: 'Maximum number of log entries to return'
    },
    offset: {
      type: 'number',
      minimum: 0,
      default: 0,
      description: 'Number of log entries to skip (for pagination)'
    },
    parentId: {
      type: 'string',
      description: 'Filter by parent activity ID'
    },
    sequenceFrom: {
      type: 'number',
      minimum: 0,
      description: 'Filter logs with sequence number >= this value'
    },
    sequenceTo: {
      type: 'number',
      minimum: 0,
      description: 'Filter logs with sequence number <= this value'
    },
    relatedId: {
      type: 'string',
      description: 'Filter by specific related activity ID'
    },
    relatedIds: {
      type: 'array',
      items: { type: 'string' },
      description: 'Filter by any of related activity IDs'
    }
  },
  required: ['logsDir']
} as const