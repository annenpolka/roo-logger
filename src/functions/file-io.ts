import { promises as fs } from 'fs'
import path from 'path'
import { Result, ResultAsync, ok, err, errAsync } from 'neverthrow'
import { ActivityLog } from '../types/core.js'

export class FileIOError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message)
    this.name = 'FileIOError'
  }
}

export const generateLogFileName = (
  date: Date = new Date(),
  prefix: string = 'roo-activity-',
  extension: string = '.json'
): string => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  
  return `${prefix}${year}-${month}-${day}${extension}`
}

export const fileExists = (filePath: string): ResultAsync<boolean, FileIOError> => {
  if (!filePath || filePath.trim() === '') {
    return errAsync(new FileIOError('ファイルパスが指定されていません'))
  }

  return ResultAsync.fromPromise(
    fs.access(filePath),
    (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return new FileIOError('File not found', error as Error)
      }
      return new FileIOError(`ファイル存在確認でエラーが発生しました: ${filePath}`, error as Error)
    }
  ).map(() => true)
    .orElse((error) => {
      if (error.message === 'File not found') {
        return ResultAsync.fromSafePromise(Promise.resolve(false))
      }
      return errAsync(error)
    })
}

export const ensureDirectoryExists = (dirPath: string): ResultAsync<void, FileIOError> => {
  if (!dirPath || dirPath.trim() === '') {
    return errAsync(new FileIOError('ディレクトリパスが指定されていません'))
  }

  return ResultAsync.fromPromise(
    fs.mkdir(dirPath, { recursive: true }).then(() => undefined),
    (error) => new FileIOError(`ディレクトリ作成でエラーが発生しました: ${dirPath}`, error as Error)
  )
}

export const readJsonFile = (filePath: string): ResultAsync<ActivityLog[], FileIOError> => {
  if (!filePath || filePath.trim() === '') {
    return errAsync(new FileIOError('ファイルパスが指定されていません'))
  }

  return fileExists(filePath)
    .andThen((exists) => {
      if (!exists) {
        return ResultAsync.fromSafePromise(Promise.resolve([]))
      }
      
      return ResultAsync.fromPromise(
        fs.readFile(filePath, 'utf-8'),
        (error) => new FileIOError(`ファイル読み込みエラー: ${filePath}`, error as Error)
      )
    })
    .andThen((content) => {
      // Type guard for content
      if (Array.isArray(content)) {
        return ResultAsync.fromSafePromise(Promise.resolve(content))
      }
      
      const textContent = content as string
      if (textContent.trim() === '') {
        return ResultAsync.fromSafePromise(Promise.resolve([]))
      }

      return ResultAsync.fromPromise(
        Promise.resolve().then(() => JSON.parse(textContent)),
        (parseError) => new FileIOError(`JSONパースエラー: ${filePath}`, parseError as Error)
      ).map((parsed: unknown) => Array.isArray(parsed) ? parsed as ActivityLog[] : [])
    })
}

export const appendToJsonFile = (filePath: string, log: ActivityLog): ResultAsync<void, FileIOError> => {
  if (!filePath || filePath.trim() === '') {
    return errAsync(new FileIOError('ファイルパスが指定されていません'))
  }

  const dirPath = path.dirname(filePath)
  
  return ensureDirectoryExists(dirPath)
    .andThen(() => readJsonFile(filePath))
    .andThen((logs) => {
      const updatedLogs = [...logs, log]
      return ResultAsync.fromPromise(
        fs.writeFile(filePath, JSON.stringify(updatedLogs, null, 2), 'utf-8').then(() => undefined),
        (error) => new FileIOError(`ファイル書き込みエラー: ${filePath}`, error as Error)
      )
    })
}

// saveActivityLog function for compatibility
export const saveActivityLog = (log: ActivityLog, logsDir: string): ResultAsync<string, FileIOError> => {
  const fileName = generateLogFileName()
  const filePath = path.join(logsDir, fileName)
  
  return appendToJsonFile(filePath, log)
    .map(() => filePath)
}