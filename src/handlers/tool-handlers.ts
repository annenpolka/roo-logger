import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { logActivityTool, getLogFilesTool, searchLogsTool } from '../tools/mcp-tools.js'
import { LogActivityArgsSchema, GetLogFilesArgsSchema, SearchLogsArgsSchema } from '../schemas/tool-schemas.js'
import { Result } from '../types/result.js'

export class MCPToolError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message)
    this.name = 'MCPToolError'
  }
}

/**
 * Type-safe MCP tool handlers with Zod validation
 */
export class TypedMCPHandlers {
  /**
   * Creates an error result for MCP responses
   */
  private static createErrorResult(message: string): CallToolResult {
    return {
      content: [{ 
        type: 'text', 
        text: JSON.stringify({ error: message }, null, 2) 
      }],
      isError: true
    }
  }

  /**
   * Creates a success result for MCP responses
   */
  private static createSuccessResult<T>(result: Result<T, Error>): CallToolResult {
    if (result.type === 'success') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result.value, null, 2)
        }]
      }
    } else {
      throw new MCPToolError(result.error.message, result.error)
    }
  }

  /**
   * Handles log_activity tool requests with type safety
   */
  static async handleLogActivity(args: unknown): Promise<CallToolResult> {
    try {
      // Validate arguments with Zod
      const parseResult = LogActivityArgsSchema.safeParse(args)
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ')
        return this.createErrorResult(`Invalid arguments for log_activity: ${errorDetails}`)
      }

      // Execute tool with validated data
      const result = await logActivityTool(parseResult.data)
      return this.createSuccessResult(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      return this.createErrorResult(`Failed to execute log_activity: ${message}`)
    }
  }

  /**
   * Handles get_log_files tool requests with type safety
   */
  static async handleGetLogFiles(args: unknown): Promise<CallToolResult> {
    try {
      // Validate arguments with Zod
      const parseResult = GetLogFilesArgsSchema.safeParse(args)
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ')
        return this.createErrorResult(`Invalid arguments for get_log_files: ${errorDetails}`)
      }

      // Execute tool with validated data
      const result = await getLogFilesTool(parseResult.data)
      return this.createSuccessResult(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      return this.createErrorResult(`Failed to execute get_log_files: ${message}`)
    }
  }

  /**
   * Handles search_logs tool requests with type safety
   */
  static async handleSearchLogs(args: unknown): Promise<CallToolResult> {
    try {
      // Validate arguments with Zod
      const parseResult = SearchLogsArgsSchema.safeParse(args)
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ')
        return this.createErrorResult(`Invalid arguments for search_logs: ${errorDetails}`)
      }

      // Execute tool with validated data
      const result = await searchLogsTool(parseResult.data)
      return this.createSuccessResult(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      return this.createErrorResult(`Failed to execute search_logs: ${message}`)
    }
  }

  /**
   * Route tool requests to appropriate handlers
   */
  static async handleToolRequest(toolName: string, args: unknown): Promise<CallToolResult> {
    switch (toolName) {
      case 'log_activity':
        return this.handleLogActivity(args)
      case 'get_log_files':
        return this.handleGetLogFiles(args)
      case 'search_logs':
        return this.handleSearchLogs(args)
      default:
        return this.createErrorResult(`Unknown tool: ${toolName}`)
    }
  }
}