import { ActivityLog } from '../types/core.js'
import { SearchFilters, applyFilters } from './search-filters.js'
import { applyPagination } from './pagination.js'

// Re-export for backward compatibility
export { SearchFilters } from './search-filters.js'
export { applyPagination } from './pagination.js'

// Alias for the new optimized function
export const filterLogs = applyFilters