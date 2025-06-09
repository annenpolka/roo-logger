import { Result, success, failure } from '../types/result.js'
import { ActivityLogInput, validateActivityLogInput } from '../functions/validation.js'
import { createActivityLog } from '../functions/log-entry.js'
import { generateLogFileName, appendToJsonFile, readJsonFile, ensureDirectoryExists } from '../functions/file-io.js'
import { filterLogs, applyPagination, SearchFilters } from '../functions/search.js'
import { LogActivityResult, GetLogFilesArgs, GetLogFilesResult, SearchLogsArgs, SearchLogsResult, LogFileInfo } from '../types/search.js'
import { promises as fs } from 'fs'
import path from 'path'

export class MCPToolError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message)
    this.name = 'MCPToolError'
  }
}

export const logActivityTool = async (input: unknown): Promise<Result<LogActivityResult, MCPToolError>> => {
  try {
    // 入力検証
    const validationResult = validateActivityLogInput(input)
    if (validationResult.type === 'failure') {
      return failure(new MCPToolError(validationResult.error.message, validationResult.error))
    }

    const validInput = validationResult.value

    // ログエントリ作成
    const log = createActivityLog(validInput)

    // ファイルパス生成
    const fileName = generateLogFileName()
    const filePath = path.join(validInput.logsDir, fileName)

    // ファイルに追記
    const writeResult = await appendToJsonFile(filePath, log)
    if (writeResult.type === 'failure') {
      return failure(new MCPToolError(`ファイル書き込みに失敗しました: ${writeResult.error.message}`, writeResult.error))
    }

    return success({
      success: true,
      logId: log.id,
      filePath
    })
  } catch (error) {
    return failure(new MCPToolError('ログ記録中に予期しないエラーが発生しました', error as Error))
  }
}

const findLogFiles = async (
  dirPath: string,
  prefix: string = 'roo-activity-',
  extension: string = '.json',
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<LogFileInfo[]> => {
  if (currentDepth >= maxDepth) return []

  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true })
    const files: LogFileInfo[] = []

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name)
      
      if (item.isDirectory()) {
        // 再帰的にサブディレクトリを探索
        const subFiles = await findLogFiles(itemPath, prefix, extension, maxDepth, currentDepth + 1)
        files.push(...subFiles)
      } else if (item.isFile() && item.name.startsWith(prefix) && item.name.endsWith(extension)) {
        // ログファイルの場合
        const stat = await fs.stat(itemPath)
        files.push({
          name: item.name,
          path: itemPath,
          size: stat.size,
          modifiedTime: stat.mtime.toISOString()
        })
      }
    }

    return files
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

export const getLogFilesTool = async (args: GetLogFilesArgs): Promise<Result<GetLogFilesResult, MCPToolError>> => {
  try {
    const {
      logsDir,
      limit = 10,
      offset = 0,
      logFilePrefix = 'roo-activity-',
      logFileExtension = '.json',
      maxDepth = 3
    } = args

    // ディレクトリ存在確認
    try {
      await fs.access(logsDir)
    } catch {
      return failure(new MCPToolError(`ディレクトリが存在しません: ${logsDir}`))
    }

    // ログファイルを検索
    const files = await findLogFiles(logsDir, logFilePrefix, logFileExtension, maxDepth)

    // ファイル名でソート（新しい順） - 日付ベースのため名前でソートすれば日付順になる
    files.sort((a: LogFileInfo, b: LogFileInfo) => b.name.localeCompare(a.name))

    // ページネーション適用
    const totalCount = files.length
    const paginatedFiles = files.slice(offset, offset + limit)

    return success({
      files: paginatedFiles,
      totalCount,
      offset,
      limit
    })
  } catch (error) {
    return failure(new MCPToolError('ログファイル取得中にエラーが発生しました', error as Error))
  }
}

export const searchLogsTool = async (args: SearchLogsArgs): Promise<Result<SearchLogsResult, MCPToolError>> => {
  try {
    const {
      logsDir,
      limit = 50,
      offset = 0,
      logFilePrefix = 'roo-activity-',
      logFileExtension = '.json',
      type,
      level,
      startDate,
      endDate,
      searchText,
      parentId,
      sequenceFrom,
      sequenceTo,
      relatedId,
      relatedIds
    } = args

    // ディレクトリ存在確認
    try {
      await fs.access(logsDir)
    } catch {
      return failure(new MCPToolError(`ディレクトリが存在しません: ${logsDir}`))
    }

    // ログファイルを検索
    const files = await findLogFiles(logsDir, logFilePrefix, logFileExtension, 3)
    
    // 全ログファイルからログを読み込み
    const allLogs = []
    for (const file of files) {
      const readResult = await readJsonFile(file.path)
      if (readResult.type === 'success') {
        allLogs.push(...readResult.value)
      }
    }

    // 検索フィルターを適用
    const filters: SearchFilters = {
      type,
      level,
      startDate,
      endDate,
      searchText,
      parentId,
      sequenceFrom,
      sequenceTo,
      relatedId,
      relatedIds
    }

    const filteredLogs = filterLogs(allLogs, filters)

    // 時間順でソート（新しい順）
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // ページネーション適用
    const totalCount = filteredLogs.length
    const paginatedLogs = applyPagination(filteredLogs, limit, offset)

    return success({
      logs: paginatedLogs,
      totalCount,
      offset,
      limit
    })
  } catch (error) {
    return failure(new MCPToolError('ログ検索中にエラーが発生しました', error as Error))
  }
}