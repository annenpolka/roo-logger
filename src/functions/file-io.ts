import { promises as fs } from 'fs'
import path from 'path'
import { Result, success, failure } from '../types/result.js'
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

export const fileExists = async (filePath: string): Promise<Result<boolean, FileIOError>> => {
  if (!filePath || filePath.trim() === '') {
    return failure(new FileIOError('ファイルパスが指定されていません'))
  }

  try {
    await fs.access(filePath)
    return success(true)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return success(false)
    }
    return failure(new FileIOError(`ファイル存在確認でエラーが発生しました: ${filePath}`, error as Error))
  }
}

export const ensureDirectoryExists = async (dirPath: string): Promise<Result<void, FileIOError>> => {
  if (!dirPath || dirPath.trim() === '') {
    return failure(new FileIOError('ディレクトリパスが指定されていません'))
  }

  try {
    await fs.mkdir(dirPath, { recursive: true })
    return success(undefined)
  } catch (error) {
    return failure(new FileIOError(`ディレクトリ作成でエラーが発生しました: ${dirPath}`, error as Error))
  }
}

export const readJsonFile = async (filePath: string): Promise<Result<ActivityLog[], FileIOError>> => {
  if (!filePath || filePath.trim() === '') {
    return failure(new FileIOError('ファイルパスが指定されていません'))
  }

  try {
    const existsResult = await fileExists(filePath)
    if (existsResult.type === 'failure') {
      return failure(existsResult.error)
    }

    if (!existsResult.value) {
      return success([])
    }

    const content = await fs.readFile(filePath, 'utf-8')
    
    if (content.trim() === '') {
      return success([])
    }

    try {
      const parsed = JSON.parse(content)
      return success(Array.isArray(parsed) ? parsed : [])
    } catch (parseError) {
      return failure(new FileIOError(`JSONパースエラー: ${filePath}`, parseError as Error))
    }
  } catch (error) {
    return failure(new FileIOError(`ファイル読み込みエラー: ${filePath}`, error as Error))
  }
}

export const appendToJsonFile = async (filePath: string, log: ActivityLog): Promise<Result<void, FileIOError>> => {
  if (!filePath || filePath.trim() === '') {
    return failure(new FileIOError('ファイルパスが指定されていません'))
  }

  try {
    // ディレクトリが存在することを確認
    const dirPath = path.dirname(filePath)
    const ensureDirResult = await ensureDirectoryExists(dirPath)
    if (ensureDirResult.type === 'failure') {
      return failure(ensureDirResult.error)
    }

    // 既存のデータを読み込み
    const readResult = await readJsonFile(filePath)
    if (readResult.type === 'failure') {
      return failure(readResult.error)
    }

    // 新しいログを追加
    const logs = [...readResult.value, log]

    // ファイルに書き込み
    await fs.writeFile(filePath, JSON.stringify(logs, null, 2), 'utf-8')
    return success(undefined)
  } catch (error) {
    return failure(new FileIOError(`ファイル書き込みエラー: ${filePath}`, error as Error))
  }
}