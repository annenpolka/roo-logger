#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { TypedMCPHandlers } from './handlers/tool-handlers.js'
import { 
  logActivityInputSchema, 
  getLogFilesInputSchema, 
  searchLogsInputSchema 
} from './schemas/tool-schemas.js'

const server = new Server(
  {
    name: 'roo-activity-logger',
    version: '0.1.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
)

// ツール一覧の定義 - JSON Schema from schemas
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'log_activity',
        description: 'Record an activity log entry with structured data for tracking development activities, decisions, and context',
        inputSchema: logActivityInputSchema
      },
      {
        name: 'get_log_files',
        description: 'Get a paginated list of available log files in the specified directory with filtering options',
        inputSchema: getLogFilesInputSchema
      },
      {
        name: 'search_logs',
        description: 'Search and filter activity logs with various criteria including date ranges, text search, and activity relationships',
        inputSchema: searchLogsInputSchema
      }
    ]
  }
})

// ツール実行の処理 - Type-safe handlers with improved error handling
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    // Route to type-safe handler
    return await TypedMCPHandlers.handleToolRequest(name, args)
  } catch (error) {
    // Global error handling
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ 
          error: `Tool execution failed: ${message}`,
          tool: name,
          timestamp: new Date().toISOString()
        }, null, 2)
      }],
      isError: true
    }
  }
})

// サーバー起動
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