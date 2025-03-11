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
        
        // LLMに送信するプロンプトを作成
        const prompt = this.createPromptForLLM(player, boardState, capturedPieces, gameHistory);
        
        // LLMのAPIキーを取得
        const model = LLM_MODELS[modelKey];
        const apiKey = localStorage.getItem(model.keyName);
        
        if (!apiKey) {
            // APIキーが設定されていない場合はランダムな手を選択
            const randomMove = this.selectRandomMove(player);
            this.thinking = false;
            callback(randomMove, 'APIキーが設定されていないため、ランダムな手を選択しました。');
            return;
        }
        
        // LLMのAPIにリクエストを送信
        this.sendRequestToLLM(model, apiKey, prompt)
            .then(response => {
                // レスポンスから手を抽出
                const move = this.extractMoveFromResponse(response, player);
                
                // 手が抽出できた場合は、その手を返す（有効性に関係なく）
                if (move) {
                    // 手が有効かどうかをチェック
                    if (!this.isValidMove(move, player)) {
                        move.invalid = true;
                        this.thinking = false;
                        callback(move, response + '\n\n※注意: AIが指した手は反則手です。');
                    } else {
                        this.thinking = false;
                        callback(move, response);
                    }
                } else {
                    // 手が抽出できなかった場合はランダムな手を選択
                    const randomMove = this.selectRandomMove(player);
                    this.thinking = false;
                    callback(randomMove, response + '\n\n手が抽出できなかったため、ランダムな手を選択しました。');
                }
            })
            .catch(error => {
                console.error('LLM API error:', error);
                
                // エラーが発生した場合はランダムな手を選択
                const randomMove = this.selectRandomMove(player);
                this.thinking = false;
                callback(randomMove, `APIエラーが発生したため、ランダムな手を選択しました。\nエラー: ${error.message}`);
            });
    }
    
    /**
     * LLMに送信するプロンプトを作成
     * @param {number} player - プレイヤー
     * @param {Array<Array<Object>>} boardState - 盤面の状態
     * @param {Object} capturedPieces - 持ち駒の状態
     * @param {Array<Object>} gameHistory - 棋譜
     * @returns {string} プロンプト
     */
    createPromptForLLM(player, boardState, capturedPieces, gameHistory) {
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
        
        // 指示
        prompt += '思考過程を簡潔に説明してください。\n';
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
     * @returns {Promise<string>} レスポンス
     */
    async sendRequestToLLM(model, apiKey, prompt) {
        let response;
        
        switch (model.name) {
            case 'GPT-4o':
            case 'o3-mini':
                response = await this.sendRequestToOpenAI(model, apiKey, prompt);
                break;
            case 'Claude 3.7 Sonnet':
                response = await this.sendRequestToClaude(model, apiKey, prompt);
                break;
            case 'Gemini 2.0 Flash':
            case 'Gemini 2.0 Pro Exp':
                response = await this.sendRequestToGemini(model, apiKey, prompt);
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
     * @returns {Promise<string>} レスポンス
     */
    async sendRequestToOpenAI(model, apiKey, prompt) {
        const response = await fetch(model.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model.model,
                messages: [
                    { role: 'system', content: 'あなたは将棋の差し手を考えるAIです。盤面を把握し次の一手を考えてください。考えた手が実現可能であり反則でないことが最重要事項です。' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API error: ${error.error.message}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    }
    
    /**
     * Claude APIにリクエストを送信
     * @param {Object} model - モデルの情報
     * @param {string} apiKey - APIキー
     * @param {string} prompt - プロンプト
     * @returns {Promise<string>} レスポンス
     */
    async sendRequestToClaude(model, apiKey, prompt) {
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
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Claude API error: ${error.error.message}`);
        }
        
        const data = await response.json();
        return data.content[0].text;
    }
    
    /**
     * Gemini APIにリクエストを送信
     * @param {Object} model - モデルの情報
     * @param {string} apiKey - APIキー
     * @param {string} prompt - プロンプト
     * @returns {Promise<string>} レスポンス
     */
    async sendRequestToGemini(model, apiKey, prompt) {
        const response = await fetch(`${model.apiEndpoint}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000
                }
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini API error: ${error.error.message}`);
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
    
    /**
     * レスポンスから手を抽出
     * @param {string} response - レスポンス
     * @param {number} player - プレイヤー
     * @returns {Object|null} 抽出された手
     */
    extractMoveFromResponse(response, player) {
        // 「指し手:」または「指し手：」の後の部分を抽出（全角コロンにも対応）
        const moveMatch = response.match(/指し手[:|：]\s*(.+?)(?:$|\n)/);
        if (!moveMatch) {
            return null;
        }
        
        const moveText = moveMatch[1].trim();
        
        // 駒打ちの場合（数字は全角でも可能に）
        const dropMatch = moveText.match(/[１-９1-9][一二三四五六七八九](.+)打/);
        if (dropMatch) {
            const colMatch = moveText.match(/[１-９1-9]/);
            const col = 9 - (colMatch[0] >= '１' && colMatch[0] <= '９' ? 
                colMatch[0].charCodeAt(0) - '１'.charCodeAt(0) + 1 : 
                parseInt(colMatch[0]));
            const row = ['一', '二', '三', '四', '五', '六', '七', '八', '九'].indexOf(dropMatch[1]);
            const pieceName = dropMatch[2];
            
            // 駒の種類を特定
            let pieceType = null;
            for (const [type, name] of Object.entries(PIECE_NAMES)) {
                if (name === pieceName) {
                    pieceType = parseInt(type);
                    break;
                }
            }
            
            if (pieceType === null) {
                return null;
            }
            
            return {
                type: 'drop',
                player,
                pieceType,
                to: { row, col }
            };
        }
        
        // 駒の移動の場合（数字は全角でも可能に）
        const moveRegex = /([１-９1-9])([一二三四五六七八九])(.+?)(?:成)?$/;
        const match = moveText.match(moveRegex);
        if (!match) {
            return null;
        }
        
        const colMatch = match[1];
        const toCol = 9 - (colMatch >= '１' && colMatch <= '９' ? 
            colMatch.charCodeAt(0) - '１'.charCodeAt(0) + 1 : 
            parseInt(colMatch));
        const toRow = ['一', '二', '三', '四', '五', '六', '七', '八', '九'].indexOf(match[2]);
        const pieceName = match[3];
        const promote = moveText.includes('成');
        
        // 駒の種類を特定
        let pieceType = null;
        for (const [type, name] of Object.entries(PIECE_NAMES)) {
            if (name === pieceName) {
                pieceType = parseInt(type);
                break;
            }
        }
        
        if (pieceType === null) {
            return null;
        }
        
        // 盤面上で該当する駒を探す
        const possibleFromPositions = [];
        for (let row = 0; row < BOARD_SIZE.ROWS; row++) {
            for (let col = 0; col < BOARD_SIZE.COLS; col++) {
                const piece = this.game.board.board[row][col];
                if (piece.type === pieceType && piece.player === player) {
                    const fromPos = { row, col };
                    const toPos = { row: toRow, col: toCol };
                    
                    if (MoveValidator.isValidMove(this.game.board.board, fromPos, toPos, player)) {
                        possibleFromPositions.push(fromPos);
                    }
                }
            }
        }
        
        if (possibleFromPositions.length === 0) {
            return null;
        }
        
        // 複数の候補がある場合は最初のものを選択
        const fromPos = possibleFromPositions[0];
        
        return {
            type: 'move',
            player,
            from: fromPos,
            to: { row: toRow, col: toCol },
            pieceType,
            promote
        };
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
