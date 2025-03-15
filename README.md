# Roo Activity Logger

Roo の活動を自動的に記録する MCP サーバー

## 概要

このプロジェクトは、Roo による開発活動を記録するための Model Context Protocol（MCP）サーバーを提供します。コマンド実行、コード生成、ファイル操作などの活動を自動的に記録し、後から検索・分析できるようにします。

## 機能

- **活動記録**: 様々な種類の活動を記録

  - コマンド実行 (`command_execution`)
  - コード生成 (`code_generation`)
  - ファイル操作 (`file_operation`)
  - エラー発生 (`error_encountered`)
  - 判断記録 (`decision_made`)
  - 会話記録 (`conversation`)

- **記録情報**: 各活動について以下の情報を記録

  - 一意の ID
  - タイムスタンプ
  - 活動タイプ
  - ログレベル (debug, info, warn, error)
  - 概要
  - 詳細情報（任意の構造データ）
  - 活動の意図・目的
  - 活動の文脈情報
  - 親アクティビティの ID（階層関係用）
  - シーケンス番号（関連アクティビティの順序）
  - 関連アクティビティの ID 配列（グループ化用）

- **保存**: 日付ベースの JSON ファイルに保存

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

### MCP サーバーとして実行
```bash
# シンプルに実行するだけで使用できます
node dist/index.js
```

### 注意事項

- デフォルトでは、プロジェクトルートディレクトリの 'logs' フォルダにログが保存されます
- 指定したディレクトリが存在しない場合は自動的に作成されます
```

## MCP ツールの使用方法

### log_activity - 活動の記録

活動を記録するためのツールです。

#### 基本的な使用例

```javascript
// 必須パラメータを指定した最小限の呼び出し
{
  "type": "command_execution",
  "summary": "npmコマンドを実行",
  "intention": "プロジェクトの依存関係を更新するため",
  "context": "新機能実装のための準備作業として"
}
```

#### パラメータ一覧

| パラメータ名 | 必須 | 型       | 説明                                                                                                                         |
| ------------ | ---- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`       | ✅   | string   | 活動の種類（`command_execution`, `code_generation`, `file_operation`, `error_encountered`, `decision_made`, `conversation`） |
| `summary`    | ✅   | string   | 活動の要約                                                                                                                   |
| `intention`  | ✅   | string   | 活動を行う意図・目的を説明するテキスト                                                                                       |
| `context`    | ✅   | string   | 活動の文脈情報を説明するテキスト                                                                                             |
| `level`      | ❌   | string   | ログレベル（`debug`, `info`, `warn`, `error`）。デフォルト: `info`                                                           |
| `details`    | ❌   | object   | 活動の詳細情報（任意の JSON 構造）                                                                                           |
| `logsDir`    | ❌   | string   | 保存先カスタムディレクトリ（**絶対パスのみ**）                                                                              |
| `parentId`   | ❌   | string   | 親アクティビティ ID                                                                                                          |
| `sequence`   | ❌   | number   | シーケンス番号                                                                                                               |
| `relatedIds` | ❌   | string[] | 関連アクティビティ ID 配列                                                                                                   |

#### 詳細な使用例

```javascript
// すべてのパラメータを使った詳細な活動記録
{
  "type": "file_operation",
  "summary": "READMEファイルの更新",
  "intention": "ドキュメントを明確化して使いやすくするため",
  "context": "ユーザーフィードバックに基づく改善作業の一環として",
  "level": "info",
  "details": {
    "file": "README.md",
    "operation": "update",
    "changedLines": 15
  },
  "logsDir": "/absolute/path/to/logs/activity",
  "sequence": 3,
  "relatedIds": ["11223344-5566-7788-99aa-bbccddeeff00"]
}
```

### get_log_files - ログファイル一覧の取得

保存されたログファイルの一覧を取得するためのツールです。

#### 基本的な使用例

```javascript
// 必須パラメータを指定（絶対パスのログディレクトリ）
{
  "logsDir": "/absolute/path/to/logs"
}
```

#### パラメータ一覧

| パラメータ名        | 必須 | 型     | 説明                                                |
| ------------------- | ---- | ------ | --------------------------------------------------- |
| `logsDir`           | ✅   | string | ログファイルを検索するディレクトリパス（絶対パスのみ） |
| `limit`             | ❌   | number | 取得する最大ファイル数。デフォルト: `10`            |
| `offset`            | ❌   | number | スキップするファイル数。デフォルト: `0`             |
| `logFilePrefix`     | ❌   | string | ログファイル名のプレフィックス                      |
| `logFileExtension`  | ❌   | string | ログファイルの拡張子                                |

#### 詳細な使用例

```javascript
// カスタムパラメータを指定して呼び出し
{
  "logsDir": "/absolute/path/to/logs",
  "limit": 5,
  "offset": 10,
  "logFilePrefix": "custom-log-",
  "logFileExtension": ".jsonl"
}
```

### search_logs - ログの検索

保存されたログを様々な条件で検索するためのツールです。logsDir（絶対パス）パラメータが必須で、その他のフィルタリングパラメータは任意です。

#### 基本的な使用例

```javascript
// 必須パラメータのみ指定 - 指定ディレクトリの最新50件を取得
{
  "logsDir": "/absolute/path/to/logs"
}

// 活動タイプでのフィルタリング
{
  "logsDir": "/absolute/path/to/logs",
  "type": "command_execution"
}
```

#### パラメータ一覧

| パラメータ名       | 必須 | 型       | 説明                                                                                                                                         |
| ------------------ | ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `logsDir`          | ✅   | string   | ログディレクトリ（絶対パスのみ）                                                                                                             |
| `logFilePrefix`    | ❌   | string   | ログファイル名のプレフィックス                                                                                                               |
| `logFileExtension` | ❌   | string   | ログファイルの拡張子                                                                                                                         |
| `type`             | ❌   | string   | 活動タイプでフィルタリング（`command_execution`, `code_generation`, `file_operation`, `error_encountered`, `decision_made`, `conversation`） |
| `level`            | ❌   | string   | ログレベルでフィルタリング（`debug`, `info`, `warn`, `error`）                                                                               |
| `startDate`        | ❌   | string   | 検索開始日（YYYY-MM-DD 形式）                                                                                                                |
| `endDate`          | ❌   | string   | 検索終了日（YYYY-MM-DD 形式）                                                                                                                |
| `searchText`       | ❌   | string   | ログの概要または詳細に含まれるテキストで検索                                                                                                 |
| `limit`            | ❌   | number   | 取得する最大ログ数。デフォルト: `50`                                                                                                         |
| `offset`           | ❌   | number   | スキップするログ数。デフォルト: `0`                                                                                                          |
| `parentId`         | ❌   | string   | 特定の親アクティビティに関連するログのみを取得                                                                                               |
| `sequenceFrom`     | ❌   | number   | シーケンス番号の下限値                                                                                                                       |
| `sequenceTo`       | ❌   | number   | シーケンス番号の上限値                                                                                                                       |
| `relatedId`        | ❌   | string   | 特定の ID が関連 IDs に含まれるログを検索                                                                                                    |
| `relatedIds`       | ❌   | string[] | これらの ID のいずれかが関連 IDs に含まれるログを検索                                                                                        |

#### 複合条件での使用例

```javascript
// タイプとレベルを組み合わせたフィルタリング
{
  "logsDir": "/absolute/path/to/logs",
  "type": "file_operation",
  "level": "info"
}

// 日付範囲とテキスト検索の組み合わせ
{
  "logsDir": "/absolute/path/to/logs",
  "startDate": "2025-01-01",
  "endDate": "2025-03-31",
  "searchText": "webpack"
}

// 高度なフィルタリング
{
  "logsDir": "/absolute/path/to/logs",
  "logFilePrefix": "custom-",
  "type": "code_generation",
  "startDate": "2025-03-01",
  "endDate": "2025-03-14",
  "searchText": "React",
  "limit": 20,
  "sequenceFrom": 1,
  "sequenceTo": 10
}
```

#### 階層関係・関連性による検索

```javascript
// 親子関係による検索
{
  "logsDir": "/absolute/path/to/logs",
  "parentId": "00112233-4455-6677-8899-aabbccddeeff"
}

// 関連アクティビティによる検索
{
  "logsDir": "/absolute/path/to/logs",
  "relatedId": "11223344-5566-7788-99aa-bbccddeeff00"
}

// 複数の関連アクティビティのいずれかに関連するログの検索
{
  "logsDir": "/absolute/path/to/logs",
  "relatedIds": [
    "11223344-5566-7788-99aa-bbccddeeff00",
    "22334455-6677-8899-aabb-ccddeeff1122"
  ]
}
```

## Cline との連携

Cline の設定ファイル（`cline_mcp_settings.json`）に以下を追加します：

```json
{
  "mcpServers": {
    "roo-activity-logger": {
      "command": "node",
      "args": ["/path/to/roo-logger/dist/index.js"],
      "env": {},
      "disabled": false
    }
  }
}
```

## ライセンス

MIT
