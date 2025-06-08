#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { logActivityTool, getLogFilesTool, searchLogsTool } from './tools/mcp-tools.js'

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

// ツール一覧の定義
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'log_activity',
        description: 'Record an activity log entry',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['command_execution', 'code_generation', 'file_operation', 'error_encountered', 'decision_made', 'conversation'],
              description: 'Type of activity'
            },
            summary: {
              type: 'string',
              description: 'Brief summary of the activity'
            },
            intention: {
              type: 'string',
              description: 'Purpose or intention behind the activity'
            },
            context: {
              type: 'string',
              description: 'Context information'
            },
            logsDir: {
              type: 'string',
              description: 'Directory to save logs (absolute path)'
            },
            level: {
              type: 'string',
              enum: ['debug', 'info', 'warn', 'error'],
              description: 'Log level (default: info)'
            },
            details: {
              type: 'object',
              description: 'Additional structured details'
            },
            parentId: {
              type: 'string',
              description: 'Parent activity ID'
            },
            sequence: {
              type: 'number',
              description: 'Sequence number'
            },
            relatedIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Related activity IDs'
            }
          },
          required: ['type', 'summary', 'intention', 'context', 'logsDir']
        }
      },
      {
        name: 'get_log_files',
        description: 'Get list of log files',
        inputSchema: {
          type: 'object',
          properties: {
            logsDir: {
              type: 'string',
              description: 'Directory to search for logs (absolute path)'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of files to return (default: 10)'
            },
            offset: {
              type: 'number',
              description: 'Number of files to skip (default: 0)'
            },
            logFilePrefix: {
              type: 'string',
              description: 'Log file prefix (default: "roo-activity-")'
            },
            logFileExtension: {
              type: 'string',
              description: 'Log file extension (default: ".json")'
            },
            maxDepth: {
              type: 'number',
              description: 'Maximum directory depth to search (default: 3)'
            }
          },
          required: ['logsDir']
        }
      },
      {
        name: 'search_logs',
        description: 'Search log entries with various filters',
        inputSchema: {
          type: 'object',
          properties: {
            logsDir: {
              type: 'string',
              description: 'Directory to search for logs (absolute path)'
            },
            logFilePrefix: {
              type: 'string',
              description: 'Log file prefix (default: "roo-activity-")'
            },
            logFileExtension: {
              type: 'string',
              description: 'Log file extension (default: ".json")'
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
              description: 'Start date filter (YYYY-MM-DD)'
            },
            endDate: {
              type: 'string',
              description: 'End date filter (YYYY-MM-DD)'
            },
            searchText: {
              type: 'string',
              description: 'Search text in summary or details'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of logs to return (default: 50)'
            },
            offset: {
              type: 'number',
              description: 'Number of logs to skip (default: 0)'
            },
            parentId: {
              type: 'string',
              description: 'Filter by parent activity ID'
            },
            sequenceFrom: {
              type: 'number',
              description: 'Minimum sequence number'
            },
            sequenceTo: {
              type: 'number',
              description: 'Maximum sequence number'
            },
            relatedId: {
              type: 'string',
              description: 'Filter by related activity ID'
            },
            relatedIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by any of related activity IDs'
            }
          },
          required: ['logsDir']
        }
      }
    ]
  }
})

// ツール実行の処理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'log_activity': {
        const result = await logActivityTool(args)
        if (result.type === 'success') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.value, null, 2)
              }
            ]
          }
        } else {
          throw new Error(result.error.message)
        }
      }

      case 'get_log_files': {
        const result = await getLogFilesTool(args as any)
        if (result.type === 'success') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.value, null, 2)
              }
            ]
          }
        } else {
          throw new Error(result.error.message)
        }
      }

      case 'search_logs': {
        const result = await searchLogsTool(args as any)
        if (result.type === 'success') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.value, null, 2)
              }
            ]
          }
        } else {
          throw new Error(result.error.message)
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error('Server error:', error)
  process.exit(1)
})