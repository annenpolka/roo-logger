#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { format } from 'date-fns';
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
    LogResult,
    SearchLogsArgs
} from './types.js';

// ディレクトリ関連の設定
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_LOGS_DIR = path.resolve(process.cwd(), 'logs');

// 設定の型
interface LoggerConfig {
  logsDir: string;
}

// デフォルト設定
const DEFAULT_CONFIG: LoggerConfig = {
  logsDir: DEFAULT_LOGS_DIR
};

class RooActivityLogger {
  private server: Server;
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

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
   * ディレクトリの存在を確認し、なければ作成
   */
  private async ensureLogsDirectory(): Promise<void> {
    try {
      await fs.access(this.config.logsDir);
    } catch {
      await fs.mkdir(this.config.logsDir, { recursive: true });
    }
  }

  /**
   * ログファイル名を生成
   */
  private getLogFileName(date: Date = new Date()): string {
    return `roo-activity-${format(date, 'yyyy-MM-dd')}.json`;
  }

  /**
   * ログを保存
   */
  private async saveLog(log: ActivityLog, customLogsDir?: string): Promise<LogResult> {
    try {
      // 保存先ディレクトリの設定（一時的なカスタムディレクトリか通常の設定を使用）
      const originalLogsDir = this.config.logsDir;

      try {
        // カスタムディレクトリが指定されていれば、一時的に設定を変更
        if (customLogsDir) {
          const logsDir = path.isAbsolute(customLogsDir)
            ? customLogsDir
            : path.resolve(process.cwd(), customLogsDir);

          this.config.logsDir = logsDir;
        }

        await this.ensureLogsDirectory();

        const fileName = this.getLogFileName();
        const filePath = path.join(this.config.logsDir, fileName);

        // 既存のログファイルを読み込むか、新規作成
        let logs: ActivityLog[] = [];
        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          logs = JSON.parse(fileContent);
        } catch {
          // ファイルが存在しない場合は空の配列から開始
        }

        // 新しいログを追加
        logs.push(log);

        // ファイルに書き込み
        await fs.writeFile(filePath, JSON.stringify(logs, null, 2), 'utf-8');

        return { success: true, value: { logId: log.id } };
      } finally {
        // 元のディレクトリ設定に戻す
        if (customLogsDir) {
          this.config.logsDir = originalLogsDir;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: { message: errorMessage } };
    }
  }

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
                description: 'このアクティビティのログを保存するディレクトリのパス（絶対パスまたは相対パス。例: "logs/activity"、"logs/error"、"logs/analytics"など。指定しない場合はデフォルトのログディレクトリが使用されます）',
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
            required: ['type', 'summary', 'intention', 'context'],
            additionalProperties: false,
          },
        },
        {
          name: 'get_log_files',
          description: '保存されたログファイルの一覧を取得します。日付ベースのログファイル一覧を取得し、取得数の制限（limit）やスキップする数（offset）を指定したページネーション形式での取得が可能です。ファイルは新しい順（降順）でソートされます。',
          inputSchema: {
            type: 'object',
            properties: {
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
            },
            additionalProperties: false,
          },
        },
        {
          name: 'search_logs',
          description: 'ログを検索します。活動タイプ、ログレベル、日付範囲、テキスト内容など様々な条件を組み合わせた柔軟な検索が可能です。階層関係や関連性に基づいた検索、シーケンス番号による範囲指定、ページネーションもサポートしています。すべてのパラメータは任意で、指定がない場合は最新ログが返されます。',
          inputSchema: {
            type: 'object',
            properties: {
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
            },
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

    // ログディレクトリが指定されている場合は一時的にそのディレクトリを使用
    const result = await this.saveLog(log, args.logsDir);

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

  /**
   * ログファイル一覧取得ハンドラ
   */
  private async handleGetLogFiles(args: GetLogFilesArgs) {
    try {
      await this.ensureLogsDirectory();

      const limit = args.limit ?? 10;
      const offset = args.offset ?? 0;

      const files = await fs.readdir(this.config.logsDir);
      const logFiles = files
        .filter((file: string) => file.startsWith('roo-activity-') && file.endsWith('.json'))
        .sort()
        .reverse()
        .slice(offset, offset + limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(logFiles, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `エラー: ログファイル一覧の取得に失敗しました: ${errorMessage}`,
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
      await this.ensureLogsDirectory();

      // ファイル名パターンの作成
      let targetFiles: string[] = [];

      if (args.startDate && args.endDate) {
        // 日付範囲でファイルをフィルタリング
        const start = new Date(args.startDate);
        const end = new Date(args.endDate);

        const files = await fs.readdir(this.config.logsDir);
        targetFiles = files.filter((file: string) => {
          if (!file.startsWith('roo-activity-') || !file.endsWith('.json')) return false;

          const dateStr = file.replace('roo-activity-', '').replace('.json', '');
          const fileDate = new Date(dateStr);

          return fileDate >= start && fileDate <= end;
        });
      } else {
        // すべてのファイルを対象にする
        const files = await fs.readdir(this.config.logsDir);
        targetFiles = files.filter((file: string) =>
          file.startsWith('roo-activity-') && file.endsWith('.json')
        );
      }

      // ログの検索
      let allLogs: ActivityLog[] = [];

      for (const file of targetFiles) {
        const filePath = path.join(this.config.logsDir, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const logs: ActivityLog[] = JSON.parse(content);
          allLogs = [...allLogs, ...logs];
        } catch {
          // ファイル読み込みエラーは無視して次へ
          continue;
        }
      }

      // フィルタリング
      let filteredLogs = allLogs;

      if (args.type) {
        filteredLogs = filteredLogs.filter(log => log.type === args.type);
      }

      if (args.level) {
        filteredLogs = filteredLogs.filter(log => log.level === args.level);
      }

      if (args.searchText) {
        const searchTextLower = args.searchText.toLowerCase();
        filteredLogs = filteredLogs.filter(log =>
          log.summary.toLowerCase().includes(searchTextLower) ||
          JSON.stringify(log.details).toLowerCase().includes(searchTextLower)
        );
      }

      // 親子関係による検索
      if (args.parentId) {
        filteredLogs = filteredLogs.filter(log => log.parentId === args.parentId);
      }

      // シーケンス範囲による検索
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

      // 関連アクティビティIDによる検索
      if (args.relatedId) {
        filteredLogs = filteredLogs.filter(log =>
          log.relatedIds?.includes(args.relatedId!)
        );
      }

      // 複数の関連アクティビティIDのいずれかが含まれるものを検索
      if (args.relatedIds && args.relatedIds.length > 0) {
        filteredLogs = filteredLogs.filter(log =>
          log.relatedIds?.some(id => args.relatedIds?.includes(id))
        );
      }

      // ソートと制限
      filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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

  /**
   * サーバーの起動
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Roo Activity Logger MCPサーバーがstdioで実行中です');
  }
}

// コマンドライン引数を解析
function parseArgs(): { logsDir?: string } {
  const args: { logsDir?: string } = {};

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg === '--logs-dir' || arg === '-d') {
      if (i + 1 < process.argv.length) {
        args.logsDir = process.argv[++i];
      }
    }
  }

  return args;
}

// サーバー起動時の設定
async function main() {
  try {
    // コマンドライン引数を解析
    const cmdArgs = parseArgs();

    // 設定オブジェクトを作成
    const config: Partial<LoggerConfig> = {};

    // コマンドライン引数の設定
    if (cmdArgs.logsDir) {
      config.logsDir = cmdArgs.logsDir;
    }

    // サーバーを起動
    const server = new RooActivityLogger(config);
    await server.run();
  } catch (error) {
    console.error('サーバーの起動に失敗しました:', error);
  }
}

// サーバーの実行
main().catch(console.error);

// 使用方法を表示する関数（--helpオプションが指定された場合に使用）
function printHelp() {
  console.log(`
Roo Activity Logger - Rooの活動を記録するMCPサーバー

使用方法:
  node dist/index.js [options]

オプション:
  --logs-dir, -d <path>  ログファイルの保存先ディレクトリを指定
  --help, -h             このヘルプメッセージを表示

例:
  node dist/index.js --logs-dir ../activity-logs
  `);
}

// ヘルプが要求された場合
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printHelp();
  process.exit(0);
}