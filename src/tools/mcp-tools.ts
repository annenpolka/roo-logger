import { Result, ResultAsync, ok, err } from 'neverthrow'
import { createActivityLog } from '../functions/log-entry.js'
import { generateLogFileName, appendToJsonFile, readJsonFile, ensureDirectoryExists } from '../functions/file-io.js'
import { filterLogs, applyPagination, SearchFilters } from '../functions/search.js'
import { LogActivityResult, GetLogFilesResult, SearchLogsResult, LogFileInfo } from '../types/search.js'
import { LogActivityInput, GetLogFilesInput, SearchLogsInput } from '../schemas/zod-schemas.js'
import { promises as fs } from 'fs'
import path from 'path'

export class MCPToolError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message)
    this.name = 'MCPToolError'
  }
}

export const logActivityTool = (input: LogActivityInput): ResultAsync<LogActivityResult, MCPToolError> => {
  return ResultAsync.fromSafePromise(Promise.resolve(input))
    .map((validInput) => {
      // ログエントリ作成
      const log = createActivityLog(validInput)
      // ファイルパス生成
      const fileName = generateLogFileName()
      const filePath = path.join(validInput.logsDir, fileName)
      return { log, filePath }
    })
    .andThen(({ log, filePath }) => 
      // ファイルに追記
      appendToJsonFile(filePath, log)
        .map(() => ({
          success: true,
          logId: log.id,
          filePath
        }))
        .mapErr((error) => new MCPToolError(`ファイル書き込みに失敗しました: ${error.message}`, error))
    )
    .mapErr((error) => 
      error instanceof MCPToolError 
        ? error 
        : new MCPToolError('ログ記録中に予期しないエラーが発生しました', error as Error)
    )
}

const findLogFiles = (
  dirPath: string,
  prefix: string = 'roo-activity-',
  extension: string = '.json',
  maxDepth: number = 3,
  currentDepth: number = 0
): ResultAsync<LogFileInfo[], MCPToolError> => {
  if (currentDepth >= maxDepth) {
    return ResultAsync.fromSafePromise(Promise.resolve([]))
  }

  return ResultAsync.fromPromise(
    fs.readdir(dirPath, { withFileTypes: true }),
    (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return new MCPToolError('ディレクトリが存在しません', error as Error)
      }
      return new MCPToolError('ディレクトリ読み込みエラー', error as Error)
    }
  ).andThen((items) => {
    // ディレクトリとファイルを分離して処理を最適化
    const directories: string[] = []
    const logFiles: { name: string; path: string }[] = []
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name)
      if (item.isDirectory()) {
        directories.push(itemPath)
      } else if (item.isFile() && item.name.startsWith(prefix) && item.name.endsWith(extension)) {
        logFiles.push({ name: item.name, path: itemPath })
      }
    }
    
    // ディレクトリの再帰処理
    const dirPromises = directories.map((dirPath) => 
      findLogFiles(dirPath, prefix, extension, maxDepth, currentDepth + 1)
    )
    
    // ファイル情報取得を並列化
    const filePromises = logFiles.map(({ name, path: itemPath }) =>
      ResultAsync.fromPromise(
        fs.stat(itemPath),
        (error) => new MCPToolError('ファイル情報取得エラー', error as Error)
      ).map((stat): LogFileInfo => ({
        name,
        path: itemPath,
        size: stat.size,
        modifiedTime: stat.mtime.toISOString()
      }))
    )
    
    // 全ての結果を結合
    return ResultAsync.combine([
      ...dirPromises,
      ResultAsync.combine(filePromises).map((files) => files as LogFileInfo[])
    ]).map((results) => results.flat())
  }).orElse((error) => {
    if (error.message.includes('ディレクトリが存在しません')) {
      return ResultAsync.fromSafePromise(Promise.resolve([]))
    }
    return err(error)
  })
}

export const getLogFilesTool = (args: GetLogFilesInput): ResultAsync<GetLogFilesResult, MCPToolError> => {
  const {
    logsDir,
    limit = 10,
    offset = 0,
    logFilePrefix = 'roo-activity-',
    logFileExtension = '.json',
    maxDepth = 3
  } = args

  // ディレクトリ存在確認 + ログファイル検索
  return ResultAsync.fromPromise(
    fs.access(logsDir),
    () => new MCPToolError(`ディレクトリが存在しません: ${logsDir}`)
  ).andThen(() =>
    findLogFiles(logsDir, logFilePrefix, logFileExtension, maxDepth)
  ).map((files) => {
    // ファイル名でソート（新しい順） - 日付ベースのため名前でソートすれば日付順になる
    files.sort((a: LogFileInfo, b: LogFileInfo) => b.name.localeCompare(a.name))

    // ページネーション適用
    const totalCount = files.length
    const paginatedFiles = files.slice(offset, offset + limit)

    return {
      files: paginatedFiles,
      totalCount,
      offset,
      limit
    }
  }).mapErr((error) => 
    new MCPToolError('ログファイル取得中にエラーが発生しました', error instanceof Error ? error : new Error(String(error)))
  )
}

export const searchLogsTool = (args: SearchLogsInput): ResultAsync<SearchLogsResult, MCPToolError> => {
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

  // ディレクトリ存在確認 + ログファイル検索
  return ResultAsync.fromPromise(
    fs.access(logsDir),
    () => new MCPToolError(`ディレクトリが存在しません: ${logsDir}`)
  ).andThen(() =>
    findLogFiles(logsDir, logFilePrefix, logFileExtension, 3)
  ).andThen((files) => {
    // ファイルが空の場合は早期リターン
    if (files.length === 0) {
      return ResultAsync.fromSafePromise(Promise.resolve([]))
    }
    
    // ファイル読み込みを並列化し、エラーを許容
    const readPromises = files.map((file) => 
      readJsonFile(file.path).orElse(() => 
        ResultAsync.fromSafePromise(Promise.resolve([]))
      )
    )
    return ResultAsync.combine(readPromises).map((results) => results.flat())
  }).map((allLogs) => {
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

    return {
      logs: paginatedLogs,
      totalCount,
      offset,
      limit
    }
  }).mapErr((error) => 
    new MCPToolError('ログ検索中にエラーが発生しました', error instanceof Error ? error : new Error(String(error)))
  )
}