# Roo分析データログ記録の設定例

Rooが開発活動の分析データを自動的にログに記録するための`.clinerules`設定例です。

## 分析データログ設定例

以下のような設定を`.clinerules`ファイルに追加することで、Rooが開発活動の分析データを自動的に記録できます：

```markdown
## 分析データ記録

開発活動の分析データは、以下の方針に従って記録してください。

### 分析データの種類

以下のデータを分析用に記録してください：

- コード品質メトリクス（複雑度、行数、依存関係など）
- パフォーマンス測定データ（実行時間、メモリ使用量など）
- 開発効率データ（タスク完了時間、コード生成量など）
- エラー発生頻度と種類の統計
- リファクタリング活動の統計

### 記録方法

- 全ての分析データはroo-activity-loggerを使用して記録してください
- 分析データログは`logs/analytics/`ディレクトリに保存してください
- ログには以下の情報を含めてください：
  - 測定名と種類
  - 数値データと単位
  - 比較基準値（該当する場合）
  - 測定コンテキスト
- 時系列データの場合は、トレンド分析が可能な形式で記録してください

### データ集計の頻度

- 継続的な開発活動中は1時間ごとに集計データを記録してください
- 重要な開発イベント（リファクタリング完了、機能実装完了など）の前後には必ず記録してください
- プロジェクトの節目（スプリント完了、リリースなど）には詳細な分析データを記録してください
```

## 使用方法

`.clinerules`ファイルにこのセクションを追加することで、Rooは開発活動中に分析データを記録します。これにより、プロジェクトの健全性や進捗状況を客観的に評価することができます。

## 分析データログ出力例

このフックにより、以下のような分析データログが自動的に記録されます：

```json
{
  "id": "f1e2d3c4-b5a6-9876-5432-1z2y3x4w5v6u",
  "timestamp": "2025-03-14T16:00:00.000Z",
  "type": "code_generation",
  "level": "info",
  "summary": "コード品質メトリクス - 定期計測",
  "details": {
    "metrics": {
      "cyclomatic_complexity": {
        "average": 4.2,
        "max": 12,
        "threshold": 15,
        "trend": "-0.3 (前回比)"
      },
      "lines_of_code": {
        "total": 3425,
        "added_since_last": 142,
        "removed_since_last": 67
      },
      "test_coverage": {
        "percentage": 87.5,
        "trend": "+2.3% (前回比)"
      },
      "dependency_count": {
        "direct": 12,
        "transitive": 45
      }
    },
    "files_analyzed": 32,
    "time_spent_ms": 1245
  },
  "intention": "コード品質の定期的なモニタリング",
  "context": "1時間ごとの定期メトリクス計測（スプリント3、3日目）"
}
```

## 特定の分析データ記録例

### パフォーマンス測定データ

```json
{
  "id": "7u8i9o0p-1q2w-3e4r-5t6y-7u8i9o0p1q2w",
  "timestamp": "2025-03-14T14:35:21.789Z",
  "type": "code_generation",
  "level": "info",
  "summary": "パフォーマンス測定 - タスクリスト機能",
  "details": {
    "feature": "タスクリスト表示",
    "metrics": {
      "render_time": {
        "value": 42.3,
        "unit": "ms",
        "threshold": 100,
        "previous": 68.5,
        "improvement": "38.2%"
      },
      "memory_usage": {
        "value": 3.8,
        "unit": "MB",
        "threshold": 5,
        "previous": 4.2,
        "improvement": "9.5%"
      },
      "initial_load_time": {
        "value": 187,
        "unit": "ms",
        "threshold": 250,
        "previous": 215,
        "improvement": "13.0%"
      }
    },
    "environment": {
      "browser": "Chrome 101",
      "device": "MacBook Pro (Apple M1)",
      "network": "Fast 3G (simulated)"
    },
    "sample_size": 10
  },
  "intention": "リファクタリング後のパフォーマンス改善の検証",
  "context": "タスクリスト表示コンポーネントのレンダリング最適化を実施後の計測"
}
```

### 開発効率データ

```json
{
  "id": "3e4r5t6y-7u8i-9o0p-a1s2-d3f4g5h6j7k8",
  "timestamp": "2025-03-14T18:00:00.000Z",
  "type": "code_generation",
  "level": "info",
  "summary": "開発効率データ - スプリント3日目",
  "details": {
    "sprint_info": {
      "sprint_number": 3,
      "day": 3,
      "completion_percentage": 42
    },
    "daily_metrics": {
      "completed_tasks": 4,
      "lines_added": 278,
      "lines_modified": 156,
      "lines_deleted": 103,
      "commits": 7,
      "tests_added": 12,
      "files_touched": 15
    },
    "time_allocation": {
      "coding": "65%",
      "testing": "20%",
      "documentation": "10%",
      "other": "5%"
    },
    "velocity": {
      "story_points_completed": 8,
      "story_points_planned": 21,
      "burn_down_status": "予定通り"
    }
  },
  "intention": "開発進捗の定期的な記録と分析",
  "context": "スプリント期間中の1日の終わりに記録する開発効率データ"
}
```

### エラー統計データ

```json
{
  "id": "l9z8x7c6-v5b4-n3m2-q1w2-e3r4t5y6u7i8",
  "timestamp": "2025-03-14T23:59:59.999Z",
  "type": "error_encountered",
  "level": "info",
  "summary": "エラー統計データ - 日次集計",
  "details": {
    "period": "2025-03-14 00:00:00 - 2025-03-14 23:59:59",
    "total_errors": 17,
    "by_severity": {
      "critical": 0,
      "high": 2,
      "medium": 5,
      "low": 10
    },
    "by_type": {
      "TypeError": 7,
      "NetworkError": 3,
      "ValidationError": 4,
      "ConfigurationError": 2,
      "Other": 1
    },
    "most_frequent_errors": [
      {
        "message": "Cannot read property 'data' of undefined",
        "count": 4,
        "locations": ["TaskService.ts:42", "DataLoader.ts:87"]
      },
      {
        "message": "Network request failed: timeout",
        "count": 3,
        "locations": ["ApiClient.ts:156"]
      }
    ],
    "resolution_stats": {
      "resolved": 15,
      "unresolved": 2,
      "average_resolution_time_minutes": 24
    }
  },
  "intention": "エラーパターンの把握と改善点の特定",
  "context": "日次エラー発生状況の集計と傾向分析"
}