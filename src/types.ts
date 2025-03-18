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
  /** 親アクティビティID（親子関係用） */
  parentId?: string;
  /** シーケンス番号（関連アクティビティの順序） */
  sequence?: number;
  /** 関連するアクティビティのID配列（グループ化用） */
  relatedIds?: readonly string[];
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
  intention: string;
  /** 活動の文脈情報を説明するテキスト */
  context: string;
  /** 親アクティビティID（親子関係用） */
  parentId?: string;
  /** シーケンス番号（関連アクティビティの順序） */
  sequence?: number;
  /** 関連するアクティビティのID配列（グループ化用） */
  relatedIds?: readonly string[];
}>;

/**
 * 共通設定パラメータ
 */
export type ToolConfigParams = Readonly<{
  logsDir: string;
  logFilePrefix?: string;
  logFileExtension?: string;
}>;

/**
 * 保存されたログファイルのリスト取得引数
 */
export type GetLogFilesArgs = Readonly<{
  logsDir: string;
  limit?: number;
  offset?: number;
  logFilePrefix?: string;
  logFileExtension?: string;
}>;

/**
 * 検索モード定義
 */
export const SearchModes = {
  NORMAL: 'normal',     // 通常の文字列検索
  GLOB: 'glob',         // グロブパターン検索
  REGEXP: 'regexp',     // 正規表現検索
} as const;

/**
 * 検索モードのユニオン型
 */
export type SearchMode = typeof SearchModes[keyof typeof SearchModes];

/**
 * 検索対象フィールド定義
 */
export const SearchFields = {
  SUMMARY: 'summary',
  DETAILS: 'details',
  INTENTION: 'intention',
  CONTEXT: 'context',
  ALL: 'all',          // すべてのフィールドを検索
} as const;

/**
 * 検索対象フィールドのユニオン型
 */
export type SearchField = typeof SearchFields[keyof typeof SearchFields];

/**
 * ログの検索引数
 */
export type SearchLogsArgs = Readonly<{
  logsDir: string;
  logFilePrefix?: string;
  logFileExtension?: string;
  type?: ActivityType;
  level?: LogLevel;
  startDate?: string;
  endDate?: string;
  /** 単一の検索テキスト（互換性のために維持） */
  searchText?: string;
  /** 複数の検索テキスト（OR検索） */
  searchTerms?: readonly string[];
  /** 検索モード（通常/glob/正規表現） */
  searchMode?: SearchMode;
  /** 検索対象フィールド */
  searchFields?: readonly SearchField[];
  /** 検索時に大文字小文字を区別するか */
  caseSensitive?: boolean;
  limit?: number;
  offset?: number;
  /** 親アクティビティIDでフィルタリング */
  parentId?: string;
  /** シーケンス範囲（開始）でフィルタリング */
  sequenceFrom?: number;
  /** シーケンス範囲（終了）でフィルタリング */
  sequenceTo?: number;
  /** 関連アクティビティIDでフィルタリング（このIDが関連IDsに含まれるログを検索） */
  relatedId?: string;
  /** 複数の関連アクティビティIDでフィルタリング（これらのIDのいずれかが関連IDsに含まれるログを検索） */
  relatedIds?: readonly string[];
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