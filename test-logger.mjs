#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import readline from 'readline';
import { v4 as uuidv4 } from 'uuid';

// サーバーの実行パスを取得
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'dist', 'index.js');

// MCPサーバーを起動
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// 標準エラー出力を表示
server.stderr.on('data', (data) => {
  console.error(`サーバーエラー出力: ${data}`);
});

// サーバーが終了した場合の処理
server.on('close', (code) => {
  console.log(`サーバーが終了しました。コード: ${code}`);
});

// リクエストIDの生成
const generateRequestId = () => uuidv4();

// MCPリクエストの作成
const createMcpRequest = (method, params) => ({
  jsonrpc: '2.0',
  id: generateRequestId(),
  method,
  params
});

// サーバーにリクエストを送信
const sendRequest = (request) => {
  const requestStr = JSON.stringify(request) + '\n';
  server.stdin.write(requestStr);
  console.log(`リクエスト送信: ${requestStr}`);
};

// 利用可能なツールを取得するリクエスト
const listToolsRequest = createMcpRequest('mcp.listTools', {});

// アクティビティを記録するリクエスト
const logActivityRequest = createMcpRequest('mcp.callTool', {
  name: 'log_activity',
  arguments: {
    type: 'command_execution',
    summary: 'テストコマンドの実行',
    level: 'info',
    details: {
      command: 'npm run test',
      exitCode: 0,
      output: 'テスト成功',
      durationMs: 1500
    }
  }
});

// ログファイル一覧を取得するリクエスト
const getLogFilesRequest = createMcpRequest('mcp.callTool', {
  name: 'get_log_files',
  arguments: {
    limit: 5
  }
});

// サーバーからのレスポンスを処理
const rl = readline.createInterface({
  input: server.stdout,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    console.log('サーバーからのレスポンス:', JSON.stringify(response, null, 2));

    // 次のリクエストを送信
    if (response.id === listToolsRequest.id) {
      console.log('ツール一覧を取得しました。アクティビティを記録します...');
      setTimeout(() => sendRequest(logActivityRequest), 500);
    } else if (response.id === logActivityRequest.id) {
      console.log('アクティビティを記録しました。ログファイル一覧を取得します...');
      setTimeout(() => sendRequest(getLogFilesRequest), 500);
    } else if (response.id === getLogFilesRequest.id) {
      console.log('テスト完了。サーバーを終了します。');
      setTimeout(() => server.kill(), 500);
    }
  } catch (error) {
    console.error('レスポンスの解析に失敗しました:', error);
  }
});

// 最初のリクエストを送信
console.log('ツール一覧を取得します...');
setTimeout(() => sendRequest(listToolsRequest), 1000);