# GPT-5.1 API 利用メモ（2025-11-27 時点・公式ドキュメント抜粋）

## 公式仕様の要点
- **エンドポイント**: `https://api.openai.com/v1/chat/completions`
- **モデル ID**: `gpt-5.1`（chat/agents兼用）
- **reasoning_effort**（推論深度）: `none`（デフォルト） / `minimal` / `low` / `medium` / `high`  citeturn0search11  
  - `gpt-5.1` は `reasoning_effort` を明示しないと **デフォルト none**（ノーリザニング）。  
  - `gpt-5.1` は `temperature/top_p/logprobs` など生成パラメータも使えるが、公式推奨は **reasoning_effort と同時に送らない**（混在はエラーになるケースあり）citeturn0search3。  
  - 旧 `reasoning` フィールドは廃止。`reasoning` を送ると “Unknown parameter” で落ちる。  
- **速度と推論の関係**: `none` が最速（簡易応答）、`low/medium` がバランス、`high` は品質重視だが遅くなる（公式実測で ~5x まで伸びるケースあり）citeturn0search1。  
- **新オプション**: `prompt_cache_retention='24h'` で長時間キャッシュ可能（任意）citeturn0search1。

## 現状コードの実装状態（js/bot.js 時点）
- Chat Completions API を使用。
- GPT-5.1 へは **reasoning_effort を送っていない**（温度も送っていない）→ デフォルト `none` で実行。  
- 非 GPT-5.1 の場合のみ `temperature=0.2` を付与。
- そのため **High/Medium reasoning は実質無効**で、レスポンスが高速&浅い。

## 改善方針（実装タスク）
1) **reasoning_effort をモデル選択に連動して送る**  
   - モデルキー `GPT51_LOW/MEDIUM/HIGH` に対応して `reasoning_effort: 'low' | 'medium' | 'high'` を Chat Completions のリクエストボディに付与する。  
   - 併用パラメータ: reasoning_effort を送る場合は `temperature/top_p` を外す（エラー防止）。  
2) **応答速度を期待値に合わせるためのUI表示**  
   - 現在の reasoning_effort を AI 思考欄に表示（デバッグ用途）  
3) **ドキュメントの通り、旧 `reasoning` パラメータを使わない**（既に削除済み）。

## 参考リンク
- OpenAI Chat API docs `reasoning_effort` 説明 citeturn0search11  
- GPT-5.1 リリースブログ（デフォルト none / “no reasoning” モード） citeturn0search1  
- GPT-5.1 パラメータ互換性注意（`temperature` は reasoning_effort なし/none の時のみ推奨） citeturn0search3
