import * as fs from 'fs/promises';
import * as path from 'path';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { ActivityLog, LogResult, LoggerConfig } from '../types.js'; // 型定義をインポート

export async function findFilesRecursively(
  dir: string,
  prefix: string,
  extension: string,
  maxDepth: number,
  currentDepth = 0
): Promise<string[]> {
  let files: string[] = [];
  try {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
      const fullPath = path.join(dir, dirent.name);
      if (dirent.isDirectory() && currentDepth < maxDepth) {
        // サブディレクトリを再帰的に探索
        const subFiles = await findFilesRecursively(
            fullPath,
            prefix,
            extension,
            maxDepth,
            currentDepth + 1
          );
        files = files.concat(subFiles);
      } else if (dirent.isFile() && dirent.name.startsWith(prefix) && dirent.name.endsWith(extension)) {
        // 条件に一致するファイルを追加
        files.push(fullPath);
      }
    }
  } catch (error) {
    // ディレクトリが存在しない、アクセス権がないなどのエラーは無視して空配列を返す
    console.error(`Error reading directory ${dir}:`, error); // エラーログは残す
  }
  return files;
}

export async function ensureLogsDirectory(logsDir: string): Promise<void> {
  try {
    await fs.access(logsDir);
  } catch (error: any) {
    // ディレクトリが存在しないエラー (ENOENT) の場合のみ作成を試みる
    if (error.code === 'ENOENT') {
      await fs.mkdir(logsDir, { recursive: true });
    } else {
      // それ以外のエラーは再スローする
      throw error;
    }
  }
}

export function getLogFileName(
  config: Pick<LoggerConfig, 'logFilePrefix' | 'logFileExtension'>,
  date: Date = new Date()
): string {
  return `${config.logFilePrefix ?? 'roo-activity-'}${format(date, 'yyyy-MM-dd')}${config.logFileExtension ?? '.json'}`;
}

export async function saveLog(
  log: ActivityLog,
  config: LoggerConfig,
  customLogsDir?: string
): Promise<LogResult> {
  try {
    let targetLogsDir = config.logsDir; // デフォルトはconfigの値

    // カスタムディレクトリが指定されている場合の処理
    if (customLogsDir) {
      // 絶対パスでなければエラー
      if (!path.isAbsolute(customLogsDir)) {
        return { success: false, error: { message: `ログディレクトリは絶対パスで指定する必要があります: ${customLogsDir}` } };
      }
      targetLogsDir = customLogsDir; // 保存先をカスタムディレクトリに変更
    }

    // ログディレクトリの存在確認・作成
    await ensureLogsDirectory(targetLogsDir);

    // ログファイル名の決定とフルパスの構築
    const fileName = getLogFileName({
      logFilePrefix: config.logFilePrefix,
      logFileExtension: config.logFileExtension
    });
    const filePath = path.join(targetLogsDir, fileName);

    // 既存のログファイルを読み込むか、新規作成
    let logs: ActivityLog[] = [];
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      logs = JSON.parse(fileContent);
      // JSON.parseが配列でないものを返した場合のエラーハンドリング
      if (!Array.isArray(logs)) {
        console.warn(`ログファイルの内容が配列形式ではありません: ${filePath}。新規ファイルとして扱います。`);
        logs = [];
      }
    } catch (readError: any) {
      // ファイルが存在しない (ENOENT) 場合は新規作成なので無視、それ以外の読み取りエラーは警告
      if (readError.code !== 'ENOENT') {
        console.warn(`既存ログファイルの読み込みに失敗しました: ${filePath}`, readError);
      }
      // 読み込み失敗時は空の配列から開始
      logs = [];
    }

    // 新しいログを追加
    logs.push(log);

    // ファイルに書き込み
    await fs.writeFile(filePath, JSON.stringify(logs, null, 2), 'utf-8');

    return { success: true, value: { logId: log.id } };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('ログの保存中にエラーが発生しました:', error); // エラー詳細をログに出力
    return { success: false, error: { message: `ログ保存エラー: ${errorMessage}` } };
  }
}