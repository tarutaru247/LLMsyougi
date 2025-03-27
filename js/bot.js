/**
 * 将棋BOTの実装を管理するクラス
 */
class Bot {
    /**
     * BOTのインスタンスを作成
     * @param {Game} game - ゲームのインスタンス
     */
    constructor(game) {
        this.game = game;
        this.thinking = false;
        this.currentModel = null;
    }
    
    /**
     * ランダムな合法手を選択
     * @param {number} player - プレイヤー
     * @returns {Object} 選択された手
     */
    selectRandomMove(player) {
        // 合法手をすべて取得
        const allMoves = this.game.getAllPossibleMoves(player);
        
        // 合法手がない場合はnullを返す
        if (allMoves.length === 0) {
            return null;
        }
        
        // ランダムに1手選択
        const randomIndex = Math.floor(Math.random() * allMoves.length);
        return allMoves[randomIndex];
    }
    
    /**
     * LLMを使用して手を選択
     * @param {number} player - プレイヤー
     * @param {string} modelKey - 使用するモデルのキー
     * @param {Function} callback - 手が選択された後に呼び出されるコールバック関数
     */
    selectMoveWithLLM(player, modelKey, callback) {
        this.thinking = true;
        this.currentModel = modelKey;
        
        // 現在の盤面状態を取得
        const boardState = this.game.board.getBoardState();
        const capturedPieces = this.game.board.getCapturedPieces();
        const gameHistory = this.game.gameHistory;
        
        // 合法手リストを取得
        const legalMoves = this.game.getAllPossibleMoves(player);
        
        // LLMに送信するプロンプトを作成
        const prompt = this.createPromptForLLM(player, boardState, capturedPieces, gameHistory, legalMoves);
        
        // LLMのAPIキーを取得
        const model = LLM_MODELS[modelKey];
        const apiKey = localStorage.getItem(model.keyName);
        
        if (!apiKey) {
            // APIキーが設定されていない場合はエラーとして扱う
            this.thinking = false;
            callback(null, 'APIキーが設定されていません。', true); // 第3引数にエラーフラグを追加
            return;
        }
        
        // LLMのAPIにリクエストを送信（合法手リストを含める）
        this.sendRequestToLLM(model, apiKey, prompt, legalMoves)
            .then(response => {
                // レスポンスから手を抽出して合法手リストから対応する手を見つける
                const move = this.extractMoveFromResponse(response, player, legalMoves);
                
                // 手が抽出できた場合
                if (move) {
                    this.thinking = false;
                    callback(move, response, false); // 成功時はエラーフラグ false
                } else {
                    // 手が抽出できなかった場合はエラーとして扱う
                    this.thinking = false;
                    // エラー情報をコールバックに渡す (手は null とする)
                    callback(null, response + '\n\n手が抽出できませんでした。', true); // 第3引数にエラーフラグを追加
                }
            })
            .catch(error => {
                console.error('LLM API error:', error);
                this.thinking = false;
                // エラー情報をコールバックに渡す (手は null とする)
                callback(null, `APIエラーが発生しました。\nエラー: ${error.message}`, true); // 第3引数にエラーフラグを追加
            });
    }
    
    /**
     * 指定された手が合法手リストに含まれているかをチェック
     * @param {Object} move - チェックする手
     * @param {Array<Object>} legalMoves - 合法手リスト
     * @returns {boolean} 合法手リストに含まれている場合はtrue
     */
    isMoveInLegalMovesList(move, legalMoves) {
        if (!move || !legalMoves || legalMoves.length === 0) {
            return false;
        }
        
        return legalMoves.some(legalMove => {
            // 手の種類が異なる場合はfalse
            if (move.type !== legalMove.type) {
                return false;
            }
            
            if (move.type === 'move') {
                // 駒の移動の場合
                return move.from.row === legalMove.from.row && 
                       move.from.col === legalMove.from.col && 
                       move.to.row === legalMove.to.row && 
                       move.to.col === legalMove.to.col && 
                       move.promote === legalMove.promote;
            } else if (move.type === 'drop') {
                // 持ち駒を打つ場合
                return move.pieceType === legalMove.pieceType && 
                       move.to.row === legalMove.to.row && 
                       move.to.col === legalMove.to.col;
            }
            
            return false;
        });
    }
    
    /**
     * LLMに送信するプロンプトを作成
     * @param {number} player - プレイヤー
     * @param {Array<Array<Object>>} boardState - 盤面の状態
     * @param {Object} capturedPieces - 持ち駒の状態
     * @param {Array<Object>} gameHistory - 棋譜
     * @param {Array<Object>} legalMoves - 合法手リスト
     * @returns {string} プロンプト
     */
    createPromptForLLM(player, boardState, capturedPieces, gameHistory, legalMoves) {
        let prompt = '将棋の対局中です。あなたは';
        prompt += player === PLAYER.SENTE ? '先手（下手）' : '後手（上手）';
        prompt += 'として、次の一手を考えてください。\n\n';
        
        // 盤面の状態
        prompt += '【盤面の状態】\n';
        prompt += this.formatBoardStateForPrompt(boardState);
        prompt += '\n';
        
        // 持ち駒の状態
        prompt += '【持ち駒】\n';
        prompt += '先手: ';
        prompt += this.formatCapturedPiecesForPrompt(capturedPieces[PLAYER.SENTE]);
        prompt += '\n';
        prompt += '後手: ';
        prompt += this.formatCapturedPiecesForPrompt(capturedPieces[PLAYER.GOTE]);
        prompt += '\n\n';
        
        // 棋譜
        if (gameHistory.length > 0) {
            prompt += '【棋譜】\n';
            gameHistory.forEach((move, index) => {
                const moveNumber = Math.floor(index / 2) + 1;
                const playerMark = move.player === PLAYER.SENTE ? '▲' : '△';
                
                let moveText = '';
                if (move.type === 'move') {
                    // 駒の移動
                    const pieceName = PIECE_NAMES[move.pieceType];
                    const toCol = 9 - move.to.col;
                    const toRow = ['一', '二', '三', '四', '五', '六', '七', '八', '九'][move.to.row];
                    
                    moveText = `${playerMark}${toCol}${toRow}${pieceName}`;
                    
                    // 成る場合
                    if (move.promote) {
                        moveText += '成';
                    }
                    
                    // 駒を取った場合
                    if (move.capture) {
                        moveText += '(取)';
                    }
                } else if (move.type === 'drop') {
                    // 持ち駒を打つ
                    const pieceName = PIECE_NAMES[move.pieceType];
                    const toCol = 9 - move.to.col;
                    const toRow = ['一', '二', '三', '四', '五', '六', '七', '八', '九'][move.to.row];
                    
                    moveText = `${playerMark}${toCol}${toRow}${pieceName}打`;
                }
                
                prompt += `${moveNumber}. ${moveText}\n`;
            });
            prompt += '\n';
        }
        
        // 合法手リスト
        prompt += '【合法手リスト】\n';
        legalMoves.forEach((move, index) => {
            let moveText = '';
            if (move.type === 'move') {
                // 駒の移動
                const pieceName = PIECE_NAMES[move.pieceType];
                const fromCol = 9 - move.from.col;
                const fromRow = ['一', '二', '三', '四', '五', '六', '七', '八', '九'][move.from.row];
                const toCol = 9 - move.to.col;
                const toRow = ['一', '二', '三', '四', '五', '六', '七', '八', '九'][move.to.row];
                
                moveText = `${fromCol}${fromRow}${pieceName}→${toCol}${toRow}`;
                
                // 成る場合
                if (move.promote) {
                    moveText += '成';
                }
            } else if (move.type === 'drop') {
                // 持ち駒を打つ
                const pieceName = PIECE_NAMES[move.pieceType];
                const toCol = 9 - move.to.col;
                const toRow = ['一', '二', '三', '四', '五', '六', '七', '八', '九'][move.to.row];
                
                moveText = `${toCol}${toRow}${pieceName}打`;
            }
            
            prompt += `${index + 1}. ${moveText}\n`;
        });
        prompt += '\n';
        
        // 指示
        prompt += '【指示】\n';
        prompt += '以下の合法手リストから最適な手を1つ選んでください。必ず合法手リストに含まれる手を選択してください。\n';
        prompt += '思考過程を簡潔に説明し、選択した手の理由も述べてください。\n';
        prompt += '次の一手を「指し手:」に続けて、以下の形式で答えてください。\n';
        prompt += '例1: 指し手:７六歩 (7筋の6段目に歩を進める)\n';
        prompt += '例2: 指し手:８八銀 (8筋の8段目に銀を動かす)\n';
        prompt += '例3: 指し手:２二角成 (2筋の2段目に角を動かして成る)\n';
        prompt += '例4: 指し手:３三桂打 (3筋の3段目に持ち駒の桂馬を打つ)\n\n';
        
        return prompt;
    }
    
    /**
     * 盤面の状態をプロンプト用にフォーマット
     * @param {Array<Array<Object>>} boardState - 盤面の状態
     * @returns {string} フォーマットされた盤面の状態
     */
    formatBoardStateForPrompt(boardState) {
        let result = '  ９ ８ ７ ６ ５ ４ ３ ２ １\n';
        result += ' +---------------------------+\n';
        
        for (let row = 0; row < BOARD_SIZE.ROWS; row++) {
            result += ['一', '二', '三', '四', '五', '六', '七', '八', '九'][row];
            result += '|';
            
            for (let col = 0; col < BOARD_SIZE.COLS; col++) {
                const piece = boardState[row][col];
                
                if (piece.type === PIECE_TYPES.EMPTY) {
                    result += ' ・';
                } else {
                    const pieceName = PIECE_NAMES[piece.type];
                    const playerMark = piece.player === PLAYER.SENTE ? ' ' : 'v';
                    result += playerMark + pieceName;
                }
            }
            
            result += '|\n';
        }
        
        result += ' +---------------------------+';
        return result;
    }
    
    /**
     * 持ち駒の状態をプロンプト用にフォーマット
     * @param {Array<Object>} capturedPieces - 持ち駒の状態
     * @returns {string} フォーマットされた持ち駒の状態
     */
    formatCapturedPiecesForPrompt(capturedPieces) {
        if (capturedPieces.length === 0) {
            return 'なし';
        }
        
        // 駒の種類ごとにグループ化
        const pieceGroups = {};
        capturedPieces.forEach(piece => {
            if (!pieceGroups[piece.type]) {
                pieceGroups[piece.type] = 0;
            }
            pieceGroups[piece.type]++;
        });
        
        // 駒の種類ごとに表示
        const result = [];
        Object.entries(pieceGroups).forEach(([type, count]) => {
            const pieceType = parseInt(type);
            const pieceName = PIECE_NAMES[pieceType];
            
            if (count > 1) {
                result.push(`${pieceName}×${count}`);
            } else {
                result.push(pieceName);
            }
        });
        
        return result.join('、');
    }
    
    /**
     * LLMのAPIにリクエストを送信
     * @param {Object} model - モデルの情報
     * @param {string} apiKey - APIキー
     * @param {string} prompt - プロンプト
     * @param {Array<Object>} legalMoves - 合法手リスト
     * @returns {Promise<string>} レスポンス
     */
    async sendRequestToLLM(model, apiKey, prompt, legalMoves) {
        let response;
        
        switch (model.name) {
            case 'GPT-4o':
            case 'o3-mini':
                response = await this.sendRequestToOpenAI(model, apiKey, prompt, legalMoves);
                break;
            case 'Claude 3.7 Sonnet':
                response = await this.sendRequestToClaude(model, apiKey, prompt, legalMoves);
                break;
            case 'Gemini 2.0 Flash':
            case 'Gemini 2.5 Pro exp (03-25)': // モデル名を constants.js と一致させる
                response = await this.sendRequestToGemini(model, apiKey, prompt, legalMoves);
                break;
            default:
                throw new Error(`未対応のモデル: ${model.name}`);
        }
        
        return response;
    }
    
    /**
     * OpenAI APIにリクエストを送信
     * @param {Object} model - モデルの情報
     * @param {string} apiKey - APIキー
     * @param {string} prompt - プロンプト
     * @param {Array<Object>} legalMoves - 合法手リスト
     * @returns {Promise<string>} レスポンス
     */
    async sendRequestToOpenAI(model, apiKey, prompt, legalMoves) {
        // リクエストボディの基本構造を作成
        const requestBody = {
            model: model.model,
            messages: [
                { 
                    role: 'system', 
                    content: 'あなたは将棋の差し手を考えるAIです。盤面を把握し次の一手を考えてください。必ず与えられた合法手リストから手を選んでください。' 
                },
                { role: 'user', content: prompt }
            ],
            stream: true // ストリーミングを有効化
        };
        
        // o3-miniモデル以外の場合はtemperatureパラメータを追加
        if (model.model !== 'o3-mini') {
            requestBody.temperature = 0.7;
        }
        
        const response = await fetch(model.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API error: ${error.error.message}`);
        }
        
        // ストリーミングレスポンスを処理
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullContent = '';
        let buffer = '';
        
        // AIの思考を初期化
        if (this.game && this.game.onAiThinkingUpdate) {
            this.game.onAiThinkingUpdate('思考中...');
        }
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // バッファにデータを追加
                buffer += decoder.decode(value, { stream: true });
                
                // データラインを処理
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.trim() === 'data: [DONE]') continue;
                    
                    try {
                        // "data: "プレフィックスを削除
                        const jsonStr = line.replace(/^data: /, '').trim();
                        if (!jsonStr) continue;
                        
                        const json = JSON.parse(jsonStr);
                        if (!json.choices || !json.choices[0]) continue;
                        
                        const { delta } = json.choices[0];
                        if (!delta || !delta.content) continue;
                        
                        // コンテンツを追加
                        fullContent += delta.content;
                        
                        // AIの思考を更新
                        if (this.game && this.game.onAiThinkingUpdate) {
                            this.game.onAiThinkingUpdate(fullContent);
                        }
                    } catch (e) {
                        console.error('Error parsing JSON from stream:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error reading stream:', error);
        }
        
        return fullContent;
    }
    
    /**
     * Claude APIにリクエストを送信
     * @param {Object} model - モデルの情報
     * @param {string} apiKey - APIキー
     * @param {string} prompt - プロンプト
     * @param {Array<Object>} legalMoves - 合法手リスト
     * @returns {Promise<string>} レスポンス
     */
    async sendRequestToClaude(model, apiKey, prompt, legalMoves) {
        const response = await fetch(model.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model.model,
                messages: [
                    { 
                        role: 'system',
                        content: 'あなたは将棋の差し手を考えるAIです。盤面を把握し次の一手を考えてください。必ず与えられた合法手リストから手を選んでください。'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                stream: true // ストリーミングを有効化
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Claude API error: ${error.error.message}`);
        }
        
        // ストリーミングレスポンスを処理
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullContent = '';
        let buffer = '';
        
        // AIの思考を初期化
        if (this.game && this.game.onAiThinkingUpdate) {
            this.game.onAiThinkingUpdate('思考中...');
        }
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // バッファにデータを追加
                buffer += decoder.decode(value, { stream: true });
                
                // データラインを処理
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.trim() === 'data: [DONE]') continue;
                    
                    try {
                        // "data: "プレフィックスを削除
                        const jsonStr = line.replace(/^data: /, '').trim();
                        if (!jsonStr) continue;
                        
                        const json = JSON.parse(jsonStr);
                        if (!json.type || json.type !== 'content_block_delta') continue;
                        
                        const delta = json.delta?.text;
                        if (!delta) continue;
                        
                        // コンテンツを追加
                        fullContent += delta;
                        
                        // AIの思考を更新
                        if (this.game && this.game.onAiThinkingUpdate) {
                            this.game.onAiThinkingUpdate(fullContent);
                        }
                    } catch (e) {
                        console.error('Error parsing JSON from stream:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error reading stream:', error);
        }
        
        return fullContent;
    }
    
    /**
     * Gemini APIにリクエストを送信
     * @param {Object} model - モデルの情報
     * @param {string} apiKey - APIキー
     * @param {string} prompt - プロンプト
     * @param {Array<Object>} legalMoves - 合法手リスト
     * @returns {Promise<string>} レスポンス
     */
    async sendRequestToGemini(model, apiKey, prompt, legalMoves) {
        const response = await fetch(`${model.apiEndpoint}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { 
                                text: 'あなたは将棋の差し手を考えるAIです。盤面を把握し次の一手を考えてください。必ず与えられた合法手リストから手を選んでください。' 
                            },
                            { text: prompt }
                        ]
                    }
                ]
                // generationConfig を一旦削除して試す
                // generationConfig: {
                //     temperature: 0.7,
                //     maxOutputTokens: 1000
                // }
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            console.error('Gemini API Response (Error):', error); // エラーレスポンスを出力
            throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`); // エラーメッセージをより安全に取得
        }
        
        // レスポンスを直接JSONとして解析
        const json = await response.json();
        console.log('Gemini API Response (Success - Full):', json); // 成功レスポンス全体を出力
        console.log('Gemini API Response (Success - Candidates):', json.candidates); // candidates の中身を出力

        // レスポンス形式のチェックをさらに詳細にする
        const candidate = json.candidates?.[0];
        if (!candidate) {
            console.error('Invalid response format: No candidates found. Full response:', json);
            throw new Error('Invalid response format from Gemini API: No candidates.');
        }

        const content = candidate.content;
        if (!content) {
            // finishReason があれば表示する (例: SAFETY)
            const finishReason = candidate.finishReason;
            console.error(`Invalid response format: No content found in candidate. Finish reason: ${finishReason || 'N/A'}. Full candidate:`, candidate);
            throw new Error(`Invalid response format from Gemini API: No content. Finish reason: ${finishReason || 'N/A'}`);
        }

        const part = content.parts?.[0];
        if (!part) {
            console.error('Invalid response format: No parts found in content. Full content:', content);
            throw new Error('Invalid response format from Gemini API: No parts.');
        }

        const text = part.text;
        if (typeof text !== 'string') { // textが文字列であることを確認
            console.error('Invalid response format: Text part not found or not a string. Full part:', part);
            throw new Error('Invalid response format from Gemini API: Text is not a string.');
        }
        
        // AIの思考を更新
        if (this.game && this.game.onAiThinkingUpdate) {
            this.game.onAiThinkingUpdate(text);
        }
        
        return text;
    }
    
    /**
     * レスポンスから手を抽出し、合法手リストから対応する手を見つける
     * @param {string} response - レスポンス
     * @param {number} player - プレイヤー
     * @param {Array<Object>} legalMoves - 合法手リスト
     * @returns {Object|null} 抽出された手
     */
    extractMoveFromResponse(response, player, legalMoves) {
        // 「指し手:」または「指し手：」の後の部分を抽出（全角コロンにも対応）
        const moveMatch = response.match(/指し手[:|：]\s*(.+?)(?:$|\n)/);
        if (!moveMatch) {
            console.log("「指し手:」が見つかりませんでした");
            return null;
        }
        
        const moveText = moveMatch[1].trim();
        console.log("抽出された手のテキスト:", moveText);
        
        // 駒打ちの場合（数字は全角でも可能に）
        const dropMatch = moveText.match(/([１-９1-9])([一二三四五六七八九])([歩香桂銀金角飛玉と馬龍]*)打/);
        if (dropMatch) {
            const colMatch = dropMatch[1];
            const col = 9 - (colMatch >= '１' && colMatch <= '９' ? 
                colMatch.charCodeAt(0) - '１'.charCodeAt(0) + 1 : 
                parseInt(colMatch));
            const row = ['一', '二', '三', '四', '五', '六', '七', '八', '九'].indexOf(dropMatch[2]);
            const pieceName = dropMatch[3];
            
            // 駒の種類を特定
            let pieceType = null;
            for (const [type, name] of Object.entries(PIECE_NAMES)) {
                if (name === pieceName) {
                    pieceType = parseInt(type);
                    break;
                }
            }
            
            if (pieceType === null) {
                console.log("駒打ちの駒種類が特定できませんでした:", pieceName);
                return null;
            }
            
            // 合法手リストから対応する手を探す
            for (const move of legalMoves) {
                if (move.type === 'drop' && 
                    move.pieceType === pieceType && 
                    move.to.row === row && 
                    move.to.col === col) {
                    console.log("合法手リストから対応する駒打ちが見つかりました");
                    return move;
                }
            }
            
            console.log("合法手リストに対応する駒打ちが見つかりませんでした");
            return null;
        }
        
        // 矢印を含む移動形式（例: 6一金→7二）
        const arrowMoveRegex = /([１-９1-9])([一二三四五六七八九])([歩香桂銀金角飛玉と馬龍]*)→([１-９1-9])([一二三四五六七八九])(?:成)?/;
        const arrowMatch = moveText.match(arrowMoveRegex);
        if (arrowMatch) {
            // 移動元の座標
            const fromColMatch = arrowMatch[1];
            const fromCol = 9 - (fromColMatch >= '１' && fromColMatch <= '９' ? 
                fromColMatch.charCodeAt(0) - '１'.charCodeAt(0) + 1 : 
                parseInt(fromColMatch));
            const fromRow = ['一', '二', '三', '四', '五', '六', '七', '八', '九'].indexOf(arrowMatch[2]);
            
            // 移動先の座標
            const toColMatch = arrowMatch[4];
            const toCol = 9 - (toColMatch >= '１' && toColMatch <= '９' ? 
                toColMatch.charCodeAt(0) - '１'.charCodeAt(0) + 1 : 
                parseInt(toColMatch));
            const toRow = ['一', '二', '三', '四', '五', '六', '七', '八', '九'].indexOf(arrowMatch[5]);
            
            // 駒の種類
            const pieceName = arrowMatch[3];
            const promote = moveText.includes('成');
            
            console.log("矢印形式の解析結果:", {
                fromCol,
                fromRow,
                toCol,
                toRow,
                pieceName,
                promote
            });
            
            // 駒の種類を特定
            let pieceType = null;
            for (const [type, name] of Object.entries(PIECE_NAMES)) {
                if (name === pieceName) {
                    pieceType = parseInt(type);
                    break;
                }
            }
            
            if (pieceType === null) {
                console.log("移動の駒種類が特定できませんでした:", pieceName);
                return null;
            }
            
            // 合法手リストから対応する手を探す
            for (const move of legalMoves) {
                if (move.type === 'move' && 
                    move.pieceType === pieceType && 
                    move.from.row === fromRow && 
                    move.from.col === fromCol && 
                    move.to.row === toRow && 
                    move.to.col === toCol && 
                    move.promote === promote) {
                    console.log("合法手リストから対応する移動が見つかりました:", move);
                    return move;
                }
            }
            
            console.log("合法手リストに対応する移動が見つかりませんでした（矢印形式）");
        }
        
        // 通常の移動形式（例: 7六歩）
        const moveRegex = /([１-９1-9])([一二三四五六七八九])([歩香桂銀金角飛玉と馬龍]*)(?:成)?/;
        const match = moveText.match(moveRegex);
        if (!match) {
            console.log("移動の正規表現にマッチしませんでした:", moveText);
            return null;
        }
        
        const colMatch = match[1];
        const toCol = 9 - (colMatch >= '１' && colMatch <= '９' ? 
            colMatch.charCodeAt(0) - '１'.charCodeAt(0) + 1 : 
            parseInt(colMatch));
        const toRow = ['一', '二', '三', '四', '五', '六', '七', '八', '九'].indexOf(match[2]);
        const pieceName = match[3];
        const promote = moveText.includes('成');
        
        console.log("通常形式の解析結果:", {
            colMatch,
            toCol,
            toRow,
            pieceName,
            promote
        });
        
        // 駒の種類を特定
        let pieceType = null;
        for (const [type, name] of Object.entries(PIECE_NAMES)) {
            if (name === pieceName) {
                pieceType = parseInt(type);
                break;
            }
        }
        
        if (pieceType === null) {
            console.log("移動の駒種類が特定できませんでした:", pieceName);
            return null;
        }
        
        // 合法手リストから対応する手を探す
        for (const move of legalMoves) {
            if (move.type === 'move' && 
                move.pieceType === pieceType && 
                move.to.row === toRow && 
                move.to.col === toCol && 
                move.promote === promote) {
                console.log("合法手リストから対応する移動が見つかりました:", move);
                return move;
            }
        }
        
        console.log("合法手リストに対応する移動が見つかりませんでした（通常形式）");
        return null;
    }
    
    /**
     * 手が有効かどうかをチェック
     * @param {Object} move - 手
     * @param {number} player - プレイヤー
     * @returns {boolean} 有効な手の場合はtrue
     */
    isValidMove(move, player) {
        if (!move) {
            return false;
        }
        
        if (move.type === 'move') {
            return MoveValidator.isValidMove(
                this.game.board.board,
                move.from,
                move.to,
                player
            );
        } else if (move.type === 'drop') {
            return MoveValidator.canDropPiece(
                this.game.board.board,
                move.to,
                move.pieceType,
                player
            );
        }
        
        return false;
    }
}
