#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { LoggerConfig } from './types.js'; // LoggerConfig のみ残す
import { RooActivityLogger, DEFAULT_CONFIG } from './server.js'; // 追加

// ディレクトリ関連の設定 (main で使うので残す)
const __dirname = path.dirname(fileURLToPath(import.meta.url));




async function main() {
  const args = process.argv.slice(2);
  const config: Partial<LoggerConfig> = {};


  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }


  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--logs-dir' && i + 1 < args.length) {
      config.logsDir = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--log-file-prefix' && i + 1 < args.length) {
      config.logFilePrefix = args[i + 1];
      i++;
    } else if (args[i] === '--log-file-extension' && i + 1 < args.length) {
      config.logFileExtension = args[i + 1];
      i++;
    }

  }

  try {

    const logger = new RooActivityLogger(config);

    const transport = new StdioServerTransport();

    await logger.server.connect(transport);
    console.log('Roo Activity Logger MCP Server started.');
    console.log(`Using log directory: ${logger.config.logsDir}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}




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


if (import.meta.url.startsWith('file://') && process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}