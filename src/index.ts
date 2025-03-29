#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { LoggerConfig } from './types.js'; // LoggerConfig のみ残す
import { RooActivityLogger, DEFAULT_CONFIG } from './server.js'; // 追加

// ディレクトリ関連の設定 (main で使うので残す)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * メイン関数
 */
async function main() {
  const args = process.argv.slice(2);
  const config: Partial<LoggerConfig> = {};

  // ヘルプ表示
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // コマンドライン引数の解析
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--logs-dir' && i + 1 < args.length) {
      config.logsDir = path.resolve(args[i + 1]); // 絶対パスに変換
      i++; // 値の分もスキップ
    } else if (args[i] === '--log-file-prefix' && i + 1 < args.length) {
      config.logFilePrefix = args[i + 1];
      i++;
    } else if (args[i] === '--log-file-extension' && i + 1 < args.length) {
      config.logFileExtension = args[i + 1];
      i++;
    }
    // 他の引数は無視するか、エラーとして扱う
  }

  try {
    // RooActivityLogger インスタンスの作成 (インポートしたものを使用)
    const logger = new RooActivityLogger(config);
    // StdioServerTransport インスタンスの作成
    const transport = new StdioServerTransport();
    // サーバーの起動 (Serverインスタンスのlistenメソッドにtransportを渡す)
    await logger.server.connect(transport); // listen ではなく connect を使用
    console.log('Roo Activity Logger MCP Server started.'); // 起動メッセージを元に戻す
    console.log(`Using log directory: ${logger.config.logsDir}`); // 起動時にログディレクトリを表示
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * ヘルプメッセージの表示
 */
function printHelp() {
  console.log(`
Usage: roo-activity-logger [options]

Options:
  --logs-dir <path>          Specify the directory to store log files (absolute path required).
                             Default: ${DEFAULT_CONFIG.logsDir}
  --log-file-prefix <prefix> Specify the prefix for log file names.
                             Default: "${DEFAULT_CONFIG.logFilePrefix}"
  --log-file-extension <ext> Specify the extension for log file names.
                             Default: "${DEFAULT_CONFIG.logFileExtension}"
  -h, --help                 Display this help message.
  `);
}

// スクリプトとして実行された場合に main 関数を呼び出す
if (import.meta.url.startsWith('file://') && process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}