# Rooアクティビティログ記録の設定例

Rooが開発活動を行う際に自動的にログを記録するための`.clinerules`設定例です。

## アクティビティログ設定例

以下のような設定を`.clinerules`ファイルに追加することで、Rooが開発活動を行う際に自動的にログを記録できます：

```markdown
## アクティビティログ記録

開発活動は、以下の方針に従って記録してください。

### 通常活動の記録

- 全ての開発活動はroo-activity-loggerを使用して記録してください
- アクティビティログは`logs/activity/`ディレクトリに保存してください
- ログには以下の情報を含めてください：
  - 活動の種類（コード生成、コマンド実行、ファイル操作など）
  - 活動の要約
  - 活動の詳細情報
  - 活動の意図と文脈
- 重要な決定や設計選択については、その理由も記録してください

### 活動の種類

以下の活動種類に分類してログを記録してください：

- `command_execution`：コマンド実行の記録
- `code_generation`：コード生成の記録
- `file_operation`：ファイル操作の記録
- `decision_made`：設計上の決定の記録
- `conversation`：ユーザーとの対話の記録

### ログレベル

活動の重要度に応じて適切なログレベルを設定してください：

- `debug`：詳細なデバッグ情報
- `info`：通常の情報（デフォルト）
- `warn`：警告情報
- `error`：エラー情報
```

## 使用方法

`.clinerules`ファイルにこのセクションを追加することで、Rooは開発活動を行う際に上記の指示に従って行動します。これはRooへの指示（プロンプト）として機能し、Rooの行動を導きます。

## ログ出力例

このフックにより、開発活動時には以下のようなログが自動的に記録されます：

```json
{
  "id": "d8e24f1a-7b93-4c21-b5f8-3a9c4e7f1g2h",
  "timestamp": "2025-03-14T10:15:32.142Z",
  "type": "code_generation",
  "level": "info",
  "summary": "新しいタスク管理コンポーネントの実装",
  "details": {
    "component_name": "TaskManager",
    "files_created": [
      "src/components/TaskManager.tsx",
      "src/components/TaskManager.test.tsx"
    ],
    "dependencies": [
      "react",
      "styled-components"
    ]
  },
  "intention": "ユーザー要件に基づくタスク管理インターフェースの提供",
  "context": "機能ドリブン開発の一環として、ユーザーがタスクを効率的に管理できるようにするためのコンポーネント"
}
```

## 活動種類ごとのログ例

### コマンド実行ログ

```json
{
  "id": "a1b2c3d4-e5f6-7g8h-9i10-j11k12l13m14",
  "timestamp": "2025-03-14T09:23:45.789Z",
  "type": "command_execution",
  "level": "info",
  "summary": "プロジェクト依存関係のインストール",
  "details": {
    "command": "npm install react react-dom styled-components",
    "exit_code": 0,
    "duration_ms": 12345
  },
  "intention": "プロジェクトの初期設定",
  "context": "新しいReactプロジェクトのセットアップフェーズ"
}
```

### ファイル操作ログ

```json
{
  "id": "n15o16p17-q18r19-s20t21-u22v23-w24x25y26z27",
  "timestamp": "2025-03-14T11:42:18.456Z",
  "type": "file_operation",
  "level": "info",
  "summary": "設定ファイルの更新",
  "details": {
    "operation": "update",
    "path": "tsconfig.json",
    "changes": {
      "added": ["strictNullChecks", "noImplicitAny"],
      "modified": ["target: ES2020"],
      "removed": []
    }
  },
  "intention": "型安全性の強化",
  "context": "プロジェクトの品質向上イニシアチブの一環"
}