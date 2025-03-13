# Roo Activity Logger

Rooの活動を自動的に記録するMCPサーバー

## 概要

このプロジェクトは、Rooによる開発活動を記録するためのModel Context Protocol（MCP）サーバーを提供します。コマンド実行、コード生成、ファイル操作などの活動を自動的に記録し、後から検索・分析できるようにします。

## 機能

- **活動記録**: 様々な種類の活動を記録
  - コマンド実行 (`command_execution`)
  - コード生成 (`code_generation`)
  - ファイル操作 (`file_operation`)
  - エラー発生 (`error_encountered`)
  - 判断記録 (`decision_made`)
  - 会話記録 (`conversation`)

- **記録情報**: 各活動について以下の情報を記録
  - 一意のID
  - タイムスタンプ
  - 活動タイプ
  - ログレベル (debug, info, warn, error)
  - 概要
  - 詳細情報（任意の構造データ）
  - 活動の意図・目的
  - 活動の文脈情報
  - 親アクティビティのID（階層関係用）
  - シーケンス番号（関連アクティビティの順序）
  - 関連アクティビティのID配列（グループ化用）

- **保存**: 日付ベースのJSONファイルに保存

- **検索**: タイプ、レベル、日付、テキストなどで検索可能

- **カスタムディレクトリ**: 活動ごとに保存先を指定可能

## インストール

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/roo-logger.git
cd roo-logger

# 依存パッケージのインストール
npm install

# ビルド
npm run build
```

## 使用方法

### MCPサーバーとして実行

```bash
node dist/index.js
```

### ログディレクトリの指定

コマンドライン引数でログディレクトリを指定できます：

```bash
node dist/index.js --logs-dir /path/to/logs
# または
node dist/index.js -d /path/to/logs
```

### MCPツール

#### log_activity

活動を記録します。

```json
{
  "type": "command_execution",
  "summary": "npmコマンドを実行",
  "details": {
    "command": "npm install",
    "directory": "/path/to/project"
  },
  "intention": "プロジェクトの依存関係を更新するため", // オプション: 活動の意図・目的
  "context": "新機能実装のための準備作業として", // オプション: 活動の文脈
  "logsDir": "custom/logs/dir", // オプション: カスタムログディレクトリ
  "parentId": "00112233-4455-6677-8899-aabbccddeeff", // オプション: 親アクティビティID
  "sequence": 1, // オプション: シーケンス番号
  "relatedIds": ["11223344-5566-7788-99aa-bbccddeeff00", "22334455-6677-8899-aabb-ccddeeff1122"] // オプション: 関連アクティビティのID配列
}
```

#### get_log_files

ログファイルの一覧を取得します。

```json
{
  "limit": 10, // 取得する最大ファイル数（デフォルト: 10）
  "offset": 0  // スキップするファイル数（デフォルト: 0）
}
```

#### search_logs

ログを検索します。

```json
{
  "type": "command_execution", // 活動タイプでフィルタ
  "level": "info",            // ログレベルでフィルタ
  "startDate": "2025-01-01",  // 検索開始日
  "endDate": "2025-12-31",    // 検索終了日
  "searchText": "npm",        // テキスト検索
  "limit": 50,                // 取得する最大ログ数（デフォルト: 50）
  "offset": 0,                // スキップするログ数（デフォルト: 0）
  "parentId": "00112233-4455-6677-8899-aabbccddeeff", // 親アクティビティIDでフィルタ
  "sequenceFrom": 1,          // シーケンス番号の範囲（開始）
  "sequenceTo": 5,            // シーケンス番号の範囲（終了）
  "relatedId": "11223344-5566-7788-99aa-bbccddeeff00", // 関連アクティビティIDでフィルタ
  "relatedIds": ["22334455-6677-8899-aabb-ccddeeff1122", "33445566-7788-99aa-bbcc-ddeeff112233"] // 複数の関連アクティビティIDでフィルタ
}
```

## Clineとの連携

Clineの設定ファイル（`cline_mcp_settings.json`）に以下を追加します：

```json
{
  "mcpServers": {
    "roo-activity-logger": {
      "command": "node",
      "args": [
        "/path/to/roo-logger/dist/index.js"
      ],
      "env": {},
      "disabled": false,
    }
  }
}
```

## ライセンス

MIT