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
const DEFAULT_LOGS_DIR = path.resolve(__dirname, '../logs');

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
            : path.resolve(path.dirname(path.dirname(__dirname)), customLogsDir);

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
          description: 'Rooの活動を記録します',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: Object.values(ActivityTypes),
                description: '活動の種類',
              },
              summary: {
                type: 'string',
                description: '活動の要約',
              },
              level: {
                type: 'string',
                enum: Object.values(LogLevels),
                description: 'ログレベル',
                default: LogLevels.INFO,
              },
              details: {
                type: 'object',
                description: '活動の詳細情報',
                additionalProperties: true,
              },
              intention: {
                type: 'string',
                description: '活動を行う意図・目的を説明するテキスト',
              },
              context: {
                type: 'string',
                description: '活動の文脈情報を説明するテキスト',
              },
              logsDir: {
                type: 'string',
                description: 'このアクティビティのログを保存するディレクトリのパス（絶対パスまたは相対パス）',
              },
              parentId: {
                type: 'string',
                description: '親アクティビティのID（親子関係を確立する場合）',
              },
              sequence: {
                type: 'number',
                description: 'シーケンス番号（関連アクティビティの順序付け）',
              },
              relatedIds: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: '関連するアクティビティのID配列（グループ化用）',
              }
            },
            required: ['type', 'summary'],
            additionalProperties: false,
          },
        },
        {
          name: 'get_log_files',
          description: '保存されたログファイルの一覧を取得します',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: '取得する最大ファイル数',
                default: 10,
              },
              offset: {
                type: 'number',
                description: 'スキップするファイル数',
                default: 0,
              },
            },
            additionalProperties: false,
          },
        },
        {
          name: 'search_logs',
          description: 'ログを検索します。typeのみの指定（例: {"type": "command_execution"}）や、他の条件との組み合わせなど、柔軟な検索が可能です。',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: Object.values(ActivityTypes),
                description: '活動の種類でフィルタ（例: "command_execution", "code_generation"など）',
              },
              level: {
                type: 'string',
                enum: Object.values(LogLevels),
                description: 'ログレベルでフィルタ',
              },
              startDate: {
                type: 'string',
                format: 'date',
                description: '検索開始日（YYYY-MM-DD）',
              },
              endDate: {
                type: 'string',
                format: 'date',
                description: '検索終了日（YYYY-MM-DD）',
              },
              searchText: {
                type: 'string',
                description: '検索するテキスト',
              },
              limit: {
                type: 'number',
                description: '取得する最大ログ数',
                default: 50,
              },
              offset: {
                type: 'number',
                description: 'スキップするログ数',
                default: 0,
              },
              parentId: {
                type: 'string',
                description: '親アクティビティIDでフィルタリング',
              },
              sequenceFrom: {
                type: 'number',
                description: 'シーケンス範囲（開始）でフィルタリング',
              },
              sequenceTo: {
                type: 'number',
                description: 'シーケンス範囲（終了）でフィルタリング',
              },
              relatedId: {
                type: 'string',
                description: '関連アクティビティIDでフィルタリング（このIDが関連IDsに含まれるログを検索）',
              },
              relatedIds: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: '複数の関連アクティビティIDでフィルタリング（これらのIDのいずれかが関連IDsに含まれるログを検索）',
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