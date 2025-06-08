import { ActivityLog, ActivityType, LogLevel } from './core.js'

export interface SearchLogsArgs {
  logsDir: string
  logFilePrefix?: string
  logFileExtension?: string
  type?: ActivityType
  level?: LogLevel
  startDate?: string
  endDate?: string
  searchText?: string
  limit?: number
  offset?: number
  parentId?: string
  sequenceFrom?: number
  sequenceTo?: number
  relatedId?: string
  relatedIds?: string[]
}

export interface GetLogFilesArgs {
  logsDir: string
  limit?: number
  offset?: number
  logFilePrefix?: string
  logFileExtension?: string
  maxDepth?: number
}

export interface LogFileInfo {
  name: string
  path: string
  size: number
  modifiedTime: string
}

export interface SearchLogsResult {
  logs: ActivityLog[]
  totalCount: number
  offset: number
  limit: number
}

export interface GetLogFilesResult {
  files: LogFileInfo[]
  totalCount: number
  offset: number
  limit: number
}

export interface LogActivityResult {
  success: boolean
  logId: string
  filePath: string
}