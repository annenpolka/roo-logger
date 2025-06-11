#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { 
  LogActivitySchema, 
  GetLogFilesSchema, 
  SearchLogsSchema,
  type LogActivityInput,
  type GetLogFilesInput,
  type SearchLogsInput
} from './schemas/zod-schemas.js'
import { logActivity } from './functions/log-entry.js'
import { getLogFilesTool, searchLogsTool } from './tools/mcp-tools.js'

// Create an MCP server
const server = new McpServer({
  name: "roo-activity-logger",
  version: "0.2.0"
})

// log_activity tool - New API pattern
server.tool(
  'log_activity',
  'Record an activity log entry with structured data for tracking development activities, decisions, and context',
  LogActivitySchema.shape,
  async (args: LogActivityInput) => {
    try {
      const result = await logActivity(args)
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            logId: result.logId,
            filePath: result.filePath
          }, null, 2)
        }]
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: message,
            timestamp: new Date().toISOString()
          }, null, 2)
        }],
        isError: true
      }
    }
  }
)

// get_log_files tool - New API pattern
server.tool(
  'get_log_files',
  'Get a paginated list of available log files in the specified directory with filtering options',
  GetLogFilesSchema.shape,
  async (args: GetLogFilesInput) => {
    try {
      const result = await getLogFilesTool(args)
      if (result.type === 'failure') {
        throw new Error(result.error.message)
      }
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result.value, null, 2)
        }]
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: message,
            timestamp: new Date().toISOString()
          }, null, 2)
        }],
        isError: true
      }
    }
  }
)

// search_logs tool - New API pattern
server.tool(
  'search_logs',
  'Search and filter activity logs with various criteria including date ranges, text search, and activity relationships',
  SearchLogsSchema.shape,
  async (args: SearchLogsInput) => {
    try {
      const result = await searchLogsTool(args)
      if (result.type === 'failure') {
        throw new Error(result.error.message)
      }
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result.value, null, 2)
        }]
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: message,
            timestamp: new Date().toISOString()
          }, null, 2)
        }],
        isError: true
      }
    }
  }
)

// Server startup
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)

  // Server ready notification
  console.error('Roo Activity Logger MCP Server is running...')
}

// エラーハンドリング
process.on('SIGINT', async () => {
  console.error('Server shutdown requested...')
  process.exit(0)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

main().catch(error => {
  console.error('Failed to start server:', error)
  process.exit(1)
})