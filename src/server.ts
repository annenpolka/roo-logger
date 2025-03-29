import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'; // StdioServerTransport をインポート
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
  ActivityLog,
  ActivityTypes,
  GetLogFilesArgs,
  LogActivityArgs,
  LogLevels,
  SearchLogsArgs,
  SearchModes,
  SearchFields,
  LoggerConfig
} from './types.js';
import { textMatches, getSearchableText } from './utils/search.js';
import { saveLog, findFilesRecursively } from './utils/fileUtils.js'; // findFilesRecursively をインポート

// ディレクトリ関連の設定
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * デフォルト設定
 */
export const DEFAULT_CONFIG: LoggerConfig = {
  logsDir: path.join(ROOT_DIR, 'logs'),  // デフォルトはプロジェクトルートの logs ディレクトリ
  logFilePrefix: 'roo-activity-',
  logFileExtension: '.json'
};

export class RooActivityLogger {
  public server: Server; // public に変更
  public config: LoggerConfig; // public に変更して外部からアクセス可能にする (printHelp で使うため)

  constructor(config?: Partial<LoggerConfig>) {
    // 設定を初期化（デフォルト設定とユーザー指定の設定をマージ）
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };

    // ログディレクトリが絶対パスかチェック
    if (!path.isAbsolute(this.config.logsDir)) {
      throw new Error(`ログディレクトリは絶対パスで指定する必要があります: ${this.config.logsDir}`);
    }

    // MCPサーバーの初期化
    this.server = new Server(
      {
        name: 'roo-activity-logger',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // ツールのセットアップ
    this.setupTools();

    // エラーハンドリング
    this.server.onerror = (error: Error) => console.error('[MCP Error]', error);

    // シグナルハンドリング
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**


  /**
   * MCPツールのセットアップ
   */
  private setupTools(): void {
    // ツールの一覧を提供
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'log_activity',
          description: 'Rooの活動を記録します。コマンド実行、コード生成、ファイル操作、エラー発生、判断記録、会話記録など様々な活動タイプをサポートし、活動の意図や文脈とともに構造化されたログを保存します。日付ベースのJSONファイルに保存され、階層関係の管理や関連アクティビティのグループ化もサポートしています。',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: Object.values(ActivityTypes),
                description: '活動の種類（command_execution:コマンド実行、code_generation:コード生成、file_operation:ファイル操作、error_encountered:エラー発生、decision_made:判断記録、conversation:会話記録）',
              },
              summary: {
                type: 'string',
                description: '活動の要約（例: "npmコマンドを実行"、"READMEファイルの更新"など、活動内容を簡潔に表すテキスト）',
              },
              level: {
                type: 'string',
                enum: Object.values(LogLevels),
                description: 'ログレベル（debug:詳細情報、info:通常情報、warn:警告、error:エラー）。通常の活動にはinfo、詳細なデバッグ情報にはdebug、警告にはwarn、エラーにはerrorを使用します。',
                default: LogLevels.INFO,
              },
              details: {
                type: 'object',
                description: '活動の詳細情報（任意のJSON構造で、活動に関する付加情報を記録。例: ファイル操作の場合はファイル名やパス、変更行数など具体的な情報を含む構造化データ）',
                additionalProperties: true,
              },
              intention: {
                type: 'string',
                description: '活動を行う意図・目的を説明するテキスト（例: "ドキュメントを明確化して使いやすくするため"、"コードの品質を向上させるため"など、なぜその活動が必要だったかを説明）',
              },
              context: {
                type: 'string',
                description: '活動の文脈情報を説明するテキスト（例: "ユーザーフィードバックに基づく改善作業の一環として"、"新機能実装のための準備作業として"など、活動が行われた背景や状況）',
              },
              logsDir: {
                type: 'string',
                description: 'このアクティビティのログを保存するディレクトリのパス（必須・絶対パスのみ。例: "/path/to/logs/activity"、"/path/to/logs/error"など）',
              },
              parentId: {
                type: 'string',
                description: '親アクティビティのID（親子関係を確立する場合。例: 大きなタスクの一部として実行される複数の関連アクティビティをグループ化する場合に、親タスクのIDを指定）',
              },
              sequence: {
                type: 'number',
                description: 'シーケンス番号（関連アクティビティの順序付け。例: 同じ親を持つ複数のアクティビティの実行順序を1, 2, 3...と指定し、後から順序通りに処理や分析できるようにする）',
              },
              relatedIds: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: '関連するアクティビティのID配列（グループ化用。例: 直接の親子関係はないが関連性のある複数のアクティビティをリンクさせる場合に、それらのIDをリストとして指定）',
              }
            },
            required: ['type', 'summary', 'intention', 'context', 'logsDir'],
            additionalProperties: false,
          },
        },
        {
          name: 'get_log_files',
          description: '保存されたログファイルの一覧を取得します。日付ベースのログファイル一覧を取得し、取得数の制限（limit）やスキップする数（offset）を指定したページネーション形式での取得が可能です。ファイルは新しい順（降順）でソートされます。',
          inputSchema: {
            type: 'object',
            properties: {
              logsDir: {
                type: 'string',
                description: 'ログファイルを検索するディレクトリパス（絶対パスのみ）',
                minLength: 1
              },
              limit: {
                type: 'number',
                description: '取得する最大ファイル数（例: 5を指定すると最新の5つのログファイルのみを取得。大量のログファイルがある場合にページサイズを制限するのに有用）',
                default: 10,
              },
              offset: {
                type: 'number',
                description: 'スキップするファイル数（例: offset=10, limit=5とすると、11〜15番目のファイルを取得。ページネーションを実装する場合に使用）',
                default: 0,
              },
              logFilePrefix: {
                type: 'string',
                description: 'ログファイル名のプレフィックス（デフォルト: "roo-activity-"）',
              },
              logFileExtension: {
                type: 'string',
                description: 'ログファイルの拡張子（デフォルト: ".json"）',
              },
              maxDepth: {
                type: 'number',
                description: '探索するディレクトリの最大深度（0は指定ディレクトリのみ。デフォルト: 3）',
                default: 3,
              },
            },
            required: ['logsDir'],
            additionalProperties: false,
          },
        },
        {
          name: 'search_logs',
          description: 'ログを検索します。活動タイプ、ログレベル、日付範囲、テキスト内容など様々な条件を組み合わせた柔軟な検索が可能です。階層関係や関連性に基づいた検索、シーケンス番号による範囲指定、ページネーションもサポートしています。すべてのパラメータは任意で、指定がない場合は最新ログが返されます。',
          inputSchema: {
            type: 'object',
            properties: {
              logsDir: {
                type: 'string',
                description: 'ログディレクトリ（絶対パスのみ）',
                minLength: 1
              },
              logFilePrefix: {
                type: 'string',
                description: 'ログファイル名のプレフィックス（デフォルト: "roo-activity-"）',
              },
              logFileExtension: {
                type: 'string',
                description: 'ログファイルの拡張子（デフォルト: ".json"）',
              },
              type: {
                type: 'string',
                enum: Object.values(ActivityTypes),
                description: '活動の種類でフィルタ（例: "command_execution"でコマンド実行ログのみ、"code_generation"でコード生成ログのみを取得。単一タイプのアクティビティに絞った分析に有用）',
              },
              level: {
                type: 'string',
                enum: Object.values(LogLevels),
                description: 'ログレベルでフィルタ（例: "error"でエラーログのみ、"warn"で警告ログのみを取得。重要度に基づいたログのフィルタリングに使用）',
              },
              startDate: {
                type: 'string',
                format: 'date',
                description: '検索開始日（YYYY-MM-DD形式。例: "2025-01-01"と指定すると、この日付以降のログのみが検索対象に。特定期間のアクティビティ分析に使用）',
              },
              endDate: {
                type: 'string',
                format: 'date',
                description: '検索終了日（YYYY-MM-DD形式。例: "2025-03-31"と指定すると、この日付以前のログのみが検索対象に。startDateと組み合わせて日付範囲を指定）',
              },
              searchText: {
                type: 'string',
                description: '検索するテキスト（例: "webpack"と指定するとsummaryやdetailsにこのテキストを含むログを検索。特定のキーワードに関連するアクティビティを見つけるのに有用）',
              },
              limit: {
                type: 'number',
                description: '取得する最大ログ数（例: 20を指定すると、条件に一致する最新の20件のみを取得。大量のログがある場合にページサイズを制限するのに有用）',
                default: 50,
              },
              offset: {
                type: 'number',
                description: 'スキップするログ数（例: offset=50, limit=50とすると、51〜100番目のログを取得。ページネーションを実装する場合に使用）',
                default: 0,
              },
              parentId: {
                type: 'string',
                description: '親アクティビティIDでフィルタリング（例: 特定の親タスクに属するすべてのサブタスクを検索する場合に親タスクのIDを指定。階層構造のあるアクティビティを分析する際に有用）',
              },
              sequenceFrom: {
                type: 'number',
                description: 'シーケンス範囲（開始）でフィルタリング（例: 5以上のシーケンス番号を持つログのみを取得。処理フローの特定部分以降に注目する場合に有用）',
              },
              sequenceTo: {
                type: 'number',
                description: 'シーケンス範囲（終了）でフィルタリング（例: 10以下のシーケンス番号を持つログのみを取得。sequenceFromと組み合わせて特定範囲のアクティビティを分析する場合に使用）',
              },
              relatedId: {
                type: 'string',
                description: '関連アクティビティIDでフィルタリング（例: 特定のIDを関連IDsリストに含むすべてのログを検索。特定のアクティビティに関連するすべてのアクティビティを見つける場合に有用）',
              },
              relatedIds: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: '複数の関連アクティビティIDでフィルタリング（例: 指定したIDリストのいずれかを関連IDsに含むログを検索。複数の異なるアクティビティに関連するログをまとめて検索する場合に有用）',
              },
              maxDepth: { // 追加: maxDepth パラメータ
                type: 'number',
                description: '探索するディレクトリの最大深度（0は指定ディレクトリのみ。デフォルト: 3）',
                default: 3,
              },
            },
            required: ['logsDir'],
            additionalProperties: false,
          },
        },
      ],
    }));

    // ツール呼び出しのハンドリング
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      switch (request.params.name) {
        case 'log_activity':
          return this.handleLogActivity(request.params.arguments as LogActivityArgs);
        case 'get_log_files':
          return this.handleGetLogFiles(request.params.arguments as GetLogFilesArgs);
        case 'search_logs':
          return this.handleSearchLogs(request.params.arguments as SearchLogsArgs);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  /**
   * アクティビティログの作成ハンドラ
   */
  private async handleLogActivity(args: LogActivityArgs) {
    // logsDir が存在するか確認（必須パラメータ）
    if (!args.logsDir) {
      return {
        content: [
          {
            type: 'text',
            text: `エラー: ログディレクトリ(logsDir)は必須パラメータです`,
          },
        ],
        isError: true,
      };
    }

    // logsDir が絶対パスであることを確認
    if (!path.isAbsolute(args.logsDir)) {
      return {
        content: [
          {
            type: 'text',
            text: `エラー: ログディレクトリは絶対パスで指定する必要があります: ${args.logsDir}`,
          },
        ],
        isError: true,
      };
    }

    const log: ActivityLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: args.type,
      level: args.level || LogLevels.INFO,
      summary: args.summary,
      details: args.details,
      intention: args.intention,
      context: args.context,
      parentId: args.parentId,
      sequence: args.sequence,
      relatedIds: args.relatedIds,
    };

    // ログディレクトリを使用して保存（必須パラメータ）
    const result = await saveLog(log, this.config, args.logsDir);

    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `活動を記録しました。ログID: ${result.value.logId}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `エラー: ログの保存に失敗しました: ${result.error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  // findFilesRecursively メソッドは削除 (fileUtils からインポート)

  /**
   * ログファイル一覧取得ハンドラ
   */
  private async handleGetLogFiles(args: GetLogFilesArgs) {
    try {
      // logsDir が存在するか確認（必須パラメータ）
      if (!args.logsDir) {
        return {
          content: [
            {
              type: 'text',
              text: `エラー: ログディレクトリ(logsDir)は必須パラメータです`,
            },
          ],
          isError: true,
        };
      }

      // 設定パラメータの検証と適用
      if (!path.isAbsolute(args.logsDir)) {
        return {
          content: [
            {
              type: 'text',
              text: `エラー: ログディレクトリは絶対パスで指定する必要があります: ${args.logsDir}`,
            },
          ],
          isError: true,
        };
      }

      // 一時的な設定を適用
      const tempConfig = {
        ...this.config,
        logsDir: args.logsDir
      };

      if (args.logFilePrefix) {
        tempConfig.logFilePrefix = args.logFilePrefix;
      }

      if (args.logFileExtension) {
        tempConfig.logFileExtension = args.logFileExtension;
      }

      try {
        await fs.access(tempConfig.logsDir);
      } catch {
        // ディレクトリが存在しない場合
        return {
          content: [
            {
              type: 'text',
              text: `エラー: 指定されたログディレクトリが存在しません: ${tempConfig.logsDir}`,
            },
          ],
          isError: true,
        };
      }

      const limit = args.limit ?? 10;
      const offset = args.offset ?? 0;
      const maxDepth = args.maxDepth ?? 3; // デフォルトの深さを3に設定

      // 再帰的にファイルを取得 (インポートした関数を使用)
      const allLogFiles = await findFilesRecursively(
        tempConfig.logsDir,
        tempConfig.logFilePrefix,
        tempConfig.logFileExtension,
        maxDepth
      );

      // ソート、オフセット、リミットを適用
      const logFiles = allLogFiles
        .sort() // ファイル名でソート (日付順にするため)
        .reverse() // 新しい順にする
        .slice(offset, offset + limit); // ページネーション

      // 結果をテキスト形式で返すように修正
      const resultJson = {
        total: allLogFiles.length,
        files: logFiles,
      };
      return {
        content: [
          {
            type: 'text', // type を 'text' に変更
            text: JSON.stringify(resultJson, null, 2), // JSONを文字列化して text に含める
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `エラー: ログファイルの取得に失敗しました: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * ログ検索ハンドラ
   */
  private async handleSearchLogs(args: SearchLogsArgs) {
    try {
      // logsDir が存在するか確認（必須パラメータ）
      if (!args.logsDir) {
        return {
          content: [
            {
              type: 'text',
              text: `エラー: ログディレクトリ(logsDir)は必須パラメータです`,
            },
          ],
          isError: true,
        };
      }

      // 設定パラメータの検証と適用
      if (!path.isAbsolute(args.logsDir)) {
        return {
          content: [
            {
              type: 'text',
              text: `エラー: ログディレクトリは絶対パスで指定する必要があります: ${args.logsDir}`,
            },
          ],
          isError: true,
        };
      }

      // 一時的な設定を適用
      const tempConfig = {
        ...this.config,
        logsDir: args.logsDir
      };

      if (args.logFilePrefix) {
        tempConfig.logFilePrefix = args.logFilePrefix;
      }

      if (args.logFileExtension) {
        tempConfig.logFileExtension = args.logFileExtension;
      }

      try {
        await fs.access(tempConfig.logsDir);
      } catch {
        // ディレクトリが存在しない場合
        return {
          content: [
            {
              type: 'text',
              text: `エラー: 指定されたログディレクトリが存在しません: ${tempConfig.logsDir}`,
            },
          ],
          isError: true,
        };
      }

      // ログファイルの取得（再帰的に取得, インポートした関数を使用）
      const maxDepth = args.maxDepth ?? 3; // デフォルトの深さを3に設定
      const allLogFiles = await findFilesRecursively(
        tempConfig.logsDir,
        tempConfig.logFilePrefix,
        tempConfig.logFileExtension,
        maxDepth
      );
      const logFiles = allLogFiles.sort().reverse(); // 新しいファイルから検索

      // 日付範囲フィルタリング
      let filesToSearch = logFiles;
      if (args.startDate && args.endDate) {
        const start = new Date(args.startDate);
        const end = new Date(args.endDate);
        end.setDate(end.getDate() + 1); // 終了日を含むように調整

        filesToSearch = filesToSearch.filter(file => {
          // ファイル名から日付部分を抽出 (パス区切り文字を考慮)
          const fileName = path.basename(file);
          const datePartMatch = fileName.match(new RegExp(`^${tempConfig.logFilePrefix}(.+)${tempConfig.logFileExtension.replace('.', '\\.')}$`));
          if (!datePartMatch || !datePartMatch[1]) return false;
          const datePart = datePartMatch[1];
          try {
            const fileDate = new Date(datePart);
            return fileDate >= start && fileDate < end;
          } catch {
            return false; // 不正なファイル名は無視
          }
        });
      } else if (args.startDate) {
        const start = new Date(args.startDate);
        filesToSearch = filesToSearch.filter(file => {
          const fileName = path.basename(file);
          const datePartMatch = fileName.match(new RegExp(`^${tempConfig.logFilePrefix}(.+)${tempConfig.logFileExtension.replace('.', '\\.')}$`));
          if (!datePartMatch || !datePartMatch[1]) return false;
          const datePart = datePartMatch[1];
          try {
            const fileDate = new Date(datePart);
            return fileDate >= start;
          } catch {
            return false;
          }
        });
      } else if (args.endDate) {
        const end = new Date(args.endDate);
        end.setDate(end.getDate() + 1);
        filesToSearch = filesToSearch.filter(file => {
          const fileName = path.basename(file);
          const datePartMatch = fileName.match(new RegExp(`^${tempConfig.logFilePrefix}(.+)${tempConfig.logFileExtension.replace('.', '\\.')}$`));
          if (!datePartMatch || !datePartMatch[1]) return false;
          const datePart = datePartMatch[1];
          try {
            const fileDate = new Date(datePart);
            return fileDate < end;
          } catch {
            return false;
          }
        });
      }

      // 全ログエントリを読み込み
      let allLogs: ActivityLog[] = [];
      for (const file of filesToSearch) {
        // findFilesRecursively はフルパスを返すため、そのまま使用
        const filePath = file;
        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const logsFromFile: ActivityLog[] = JSON.parse(fileContent);
          allLogs = allLogs.concat(logsFromFile);
        } catch (readError) {
          console.error(`Error reading or parsing log file ${filePath}:`, readError);
          // エラーが発生したファイルはスキップ
        }
      }

      // フィルタリング
      let filteredLogs = allLogs;

      // タイプでフィルタ
      if (args.type) {
        filteredLogs = filteredLogs.filter(log => log.type === args.type);
      }

      // レベルでフィルタ
      if (args.level) {
        filteredLogs = filteredLogs.filter(log => log.level === args.level);
      }

      // テキスト検索
      const allSearchTerms: string[] = [];
      const searchMode = args.searchMode || SearchModes.NORMAL;
      const caseSensitive = args.caseSensitive ?? false;
      const searchFields = args.searchFields ? [...args.searchFields] : [SearchFields.ALL];

      // searchText と searchTerms を結合
      if (args.searchText) {
        allSearchTerms.push(args.searchText);
      }
      if (args.searchTerms && args.searchTerms.length > 0) {
        allSearchTerms.push(...args.searchTerms);
      }

      if (allSearchTerms.length > 0) {
        filteredLogs = filteredLogs.filter(log => {
          // 指定された各フィールドから検索対象テキストを取得
          const textsToSearch = searchFields.map(field => getSearchableText(log, field));
          const combinedText = textsToSearch.join(' '); // フィールド間のテキストを結合

          // いずれかの検索語にマッチするかどうかを判定
          return allSearchTerms.some(term =>
            textMatches(combinedText, term, searchMode, caseSensitive)
          );
        });
      }


      // 親IDでフィルタ
      if (args.parentId) {
        filteredLogs = filteredLogs.filter(log => log.parentId === args.parentId);
      }

      // シーケンス範囲でフィルタ
      if (args.sequenceFrom !== undefined) {
        filteredLogs = filteredLogs.filter(log =>
          log.sequence !== undefined && log.sequence >= args.sequenceFrom!
        );
      }
      if (args.sequenceTo !== undefined) {
        filteredLogs = filteredLogs.filter(log =>
          log.sequence !== undefined && log.sequence <= args.sequenceTo!
        );
      }

      // 関連IDでフィルタ
      if (args.relatedId) {
        filteredLogs = filteredLogs.filter(log =>
          log.relatedIds?.includes(args.relatedId!)
        );
      }
      if (args.relatedIds && args.relatedIds.length > 0) {
        filteredLogs = filteredLogs.filter(log =>
          log.relatedIds?.some((id: string) => args.relatedIds?.includes(id))
        );
      }


      // ソート (タイムスタンプ降順)
      filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // ページネーション
      const limit = args.limit ?? 50;
      const offset = args.offset ?? 0;
      const paginatedLogs = filteredLogs.slice(offset, offset + limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              total: filteredLogs.length,
              logs: paginatedLogs,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `エラー: ログの検索に失敗しました: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  // run メソッドは削除
}