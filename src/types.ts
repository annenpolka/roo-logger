export const ActivityTypes = {
  COMMAND_EXECUTION: "command_execution",
  CODE_GENERATION: "code_generation",
  FILE_OPERATION: "file_operation",
  ERROR_ENCOUNTERED: "error_encountered",
  DECISION_MADE: "decision_made",
  CONVERSATION: "conversation",
} as const;


export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];


export const LogLevels = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
} as const;


export type LogLevel = typeof LogLevels[keyof typeof LogLevels];


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


export type LogActivityArgs = Readonly<{
  type: ActivityType;
  summary: string;
  level?: LogLevel;
  details?: Readonly<Record<string, unknown>>;
  logsDir: string; // ログの保存先ディレクトリ（必須）
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


export type ToolConfigParams = Readonly<{
  logsDir: string;
  logFilePrefix?: string;
  logFileExtension?: string;
}>;


export type GetLogFilesArgs = Readonly<{
  logsDir: string;
  limit?: number;
  offset?: number;
  logFilePrefix?: string;
  logFileExtension?: string;
  /** 探索するディレクトリの最大深度（0は指定ディレクトリのみ） */
  maxDepth?: number;
}>;


export const SearchModes = {
  NORMAL: "normal", // 通常の文字列検索
} as const;


export type SearchMode = typeof SearchModes[keyof typeof SearchModes];


export const SearchFields = {
  SUMMARY: "summary",
  DETAILS: "details",
  INTENTION: "intention",
  CONTEXT: "context",
  ALL: "all", // すべてのフィールドを検索
} as const;


export type SearchField = typeof SearchFields[keyof typeof SearchFields];


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
  /** 探索するディレクトリの最大深度（0は指定ディレクトリのみ） */
  maxDepth?: number;
}>;


export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };


export type LogResult = Result<{ logId: string }, { message: string }>;



export interface LoggerConfig {
  logsDir: string;  // ログディレクトリパス（絶対パス）
  logFilePrefix: string;
  logFileExtension: string;
}
