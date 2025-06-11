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
    const startTimestamp = new Date(startDate).getTime()
    if (logTimestamp < startTimestamp) return false
  }
  
  if (endDate) {
    const endTimestamp = new Date(endDate).getTime()
    if (logTimestamp > endTimestamp) return false
  }
  
  return true
}

export const matchesSearchText = (log: ActivityLog, searchText?: string): boolean => {
  if (!searchText) return true
  
  const searchLower = searchText.toLowerCase()
  
  // サマリーで検索
  if (log.summary.toLowerCase().includes(searchLower)) return true
  
  // 詳細で検索（JSONを文字列化して検索）
  if (log.details) {
    const detailsText = JSON.stringify(log.details).toLowerCase()
    if (detailsText.includes(searchLower)) return true
  }
  
  return false
}

export const matchesParentId = (log: ActivityLog, parentId?: string): boolean => {
  return parentId === undefined || log.parentId === parentId
}

export const matchesSequenceRange = (log: ActivityLog, sequenceFrom?: number, sequenceTo?: number): boolean => {
  if (sequenceFrom === undefined && sequenceTo === undefined) return true
  
  if (log.sequence === undefined) return false
  
  if (sequenceFrom !== undefined && log.sequence < sequenceFrom) return false
  if (sequenceTo !== undefined && log.sequence > sequenceTo) return false
  
  return true
}

export const matchesRelatedIds = (log: ActivityLog, relatedId?: string, relatedIds?: string[]): boolean => {
  if (!relatedId && !relatedIds) return true
  
  if (!log.relatedIds || log.relatedIds.length === 0) return false
  
  // 単一のrelatedIdをチェック
  if (relatedId && log.relatedIds.includes(relatedId)) return true
  
  // 複数のrelatedIdsのいずれかをチェック
  if (relatedIds && relatedIds.some(id => log.relatedIds!.includes(id))) return true
  
  return false
}

export const filterLogs = (logs: ActivityLog[], filters: SearchFilters): ActivityLog[] => {
  return logs.filter(log => {
    return (
      matchesActivityType(log, filters.type) &&
      matchesLogLevel(log, filters.level) &&
      matchesDateRange(log, filters.startDate, filters.endDate) &&
      matchesSearchText(log, filters.searchText) &&
      matchesParentId(log, filters.parentId) &&
      matchesSequenceRange(log, filters.sequenceFrom, filters.sequenceTo) &&
      matchesRelatedIds(log, filters.relatedId, filters.relatedIds)
    )
  })
}

export const applyPagination = (logs: ActivityLog[], limit: number, offset: number): ActivityLog[] => {
  return logs.slice(offset, offset + limit)
}