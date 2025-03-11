/**
 * Rooアクティビティロガーの型定義
 */

/**
 * アクティビティのタイプ定義（as const でリテラル型として保証）
 */
export const ActivityTypes = {
  COMMAND_EXECUTION: 'command_execution',
  CODE_GENERATION: 'code_generation',
  FILE_OPERATION: 'file_operation',
  ERROR_ENCOUNTERED: 'error_encountered',
  DECISION_MADE: 'decision_made',
  CONVERSATION: 'conversation',
} as const;

/**
 * アクティビティタイプのユニオン型（型安全性の向上）
 */
export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];

/**
 * ログレベル定義（as const でリテラル型として保証）
 */
export const LogLevels = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

/**
 * ログレベルのユニオン型（型安全性の向上）
 */
export type LogLevel = typeof LogLevels[keyof typeof LogLevels];

/**
 * アクティビティログのベース構造（読み取り専用で不変性を保証）
 */
export type ActivityLog = Readonly<{
  id: string;
  timestamp: string;
  type: ActivityType;
  level: LogLevel;
  summary: string;
  /** 活動の詳細情報（任意の構造データ） */
  details?: Readonly<Record<string, unknown>>;
  /** 活動が行われた意図・目的 */
  intention?: string;
  /** 活動が行われた文脈情報 */
  context?: string;
}>;

/**
 * ツールの引数型定義（詳細な型情報で安全性を確保）
 */
export type LogActivityArgs = Readonly<{
  type: ActivityType;
  summary: string;
  level?: LogLevel;
  details?: Readonly<Record<string, unknown>>;
  logsDir?: string; // ログの保存先ディレクトリ（オプション）
  /** 活動を行う意図・目的を説明するテキスト */
  intention?: string;
  /** 活動の文脈情報を説明するテキスト */
  context?: string;
}>;

/**
 * 保存されたログファイルのリスト取得引数
 */
export type GetLogFilesArgs = Readonly<{
  limit?: number;
  offset?: number;
}>;

/**
 * ログの検索引数
 */
export type SearchLogsArgs = Readonly<{
  type?: ActivityType;
  level?: LogLevel;
  startDate?: string;
  endDate?: string;
  searchText?: string;
  limit?: number;
  offset?: number;
}>;

/**
 * Result型によるエラーハンドリング（成功または失敗の結果を表現）
 */
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * ログ保存結果
 */
export type LogResult = Result<{ logId: string }, { message: string }>;