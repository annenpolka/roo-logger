import { ActivityLog, ActivityType, LogLevel } from '../types/core.js'

export interface SearchFilters {
  type?: ActivityType
  level?: LogLevel
  startDate?: string
  endDate?: string
  searchText?: string
  parentId?: string
  sequenceFrom?: number
  sequenceTo?: number
  relatedId?: string
  relatedIds?: string[]
}

// Individual filter functions for better testability and reusability
export const matchesActivityType = (log: ActivityLog, type?: ActivityType): boolean => {
  return type === undefined || log.type === type
}

export const matchesLogLevel = (log: ActivityLog, level?: LogLevel): boolean => {
  return level === undefined || log.level === level
}

export const matchesDateRange = (log: ActivityLog, startDate?: string, endDate?: string): boolean => {
  if (!startDate && !endDate) return true
  
  const logTimestamp = new Date(log.timestamp).getTime()
  
  if (startDate) {
    let startTimestamp: number
    if (startDate.includes('T')) {
      // Full ISO timestamp
      startTimestamp = new Date(startDate).getTime()
    } else {
      // Date only, compare from start of day
      startTimestamp = new Date(startDate + 'T00:00:00.000Z').getTime()
    }
    if (isNaN(startTimestamp) || logTimestamp < startTimestamp) return false
  }
  
  if (endDate) {
    let endTimestamp: number
    if (endDate.includes('T')) {
      // Full ISO timestamp
      endTimestamp = new Date(endDate).getTime()
    } else {
      // Date only, compare to end of day
      endTimestamp = new Date(endDate + 'T23:59:59.999Z').getTime()
    }
    if (isNaN(endTimestamp) || logTimestamp > endTimestamp) return false
  }
  
  return true
}

export const matchesSearchText = (log: ActivityLog, searchText?: string): boolean => {
  if (!searchText) return true
  
  const searchLower = searchText.toLowerCase()
  const fields = [
    log.summary,
    log.intention,
    log.context,
    log.details ? JSON.stringify(log.details) : ''
  ]
  
  return fields.some(field => field.toLowerCase().includes(searchLower))
}

export const matchesParent = (log: ActivityLog, parentId?: string): boolean => {
  return parentId === undefined || log.parentId === parentId
}

export const matchesSequenceRange = (log: ActivityLog, sequenceFrom?: number, sequenceTo?: number): boolean => {
  if (log.sequence === undefined) return sequenceFrom === undefined && sequenceTo === undefined
  if (sequenceFrom !== undefined && log.sequence < sequenceFrom) return false
  if (sequenceTo !== undefined && log.sequence > sequenceTo) return false
  return true
}

export const matchesRelatedIds = (log: ActivityLog, relatedId?: string, relatedIds?: string[]): boolean => {
  if (!relatedId && !relatedIds) return true
  if (!log.relatedIds || log.relatedIds.length === 0) return false
  
  if (relatedId && !log.relatedIds.includes(relatedId)) return false
  if (relatedIds && !relatedIds.some(id => log.relatedIds!.includes(id))) return false
  
  return true
}

// Composite filter function
export const applyFilters = (logs: ActivityLog[], filters: SearchFilters): ActivityLog[] => {
  return logs.filter(log => 
    matchesActivityType(log, filters.type) &&
    matchesLogLevel(log, filters.level) &&
    matchesDateRange(log, filters.startDate, filters.endDate) &&
    matchesSearchText(log, filters.searchText) &&
    matchesParent(log, filters.parentId) &&
    matchesSequenceRange(log, filters.sequenceFrom, filters.sequenceTo) &&
    matchesRelatedIds(log, filters.relatedId, filters.relatedIds)
  )
}