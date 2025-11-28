/**
 * Shogi BOT: passes board state to LLM and parses its reply.
 * 文字化け防止のため全体をUTF-8で記述。
 */
class Bot {
    constructor(game) {
        this.game = game;
        this.thinking = false;
        this.currentModel = null;
    }

    /** 開発用ランダム手 */
    selectRandomMove(player) {
        const legalMoves = this.game.getAllPossibleMoves(player);
        if (!legalMoves.length) return null;
        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    /**
     * LLMで手を選択
     */
    async selectMoveWithLLM(player, modelKey, callback) {
        this.thinking = true;
        this.currentModel = modelKey;

        const boardState = this.game.board.getBoardState();
        const capturedPieces = this.game.board.getCapturedPieces();
        const gameHistory = this.game.gameHistory;
        const legalMoves = this.game.getAllPossibleMoves(player);

        // 合法手が無ければ終了
        if (!legalMoves.length) {
            this.thinking = false;
            callback(null, '合法手がありません（詰み/手詰まり）', true);
            return;
        }

        const model = LLM_MODELS[modelKey];

        // ランダムダミーはAPIを呼ばず1秒ディレイ＋ランダム手
        if (model && model.isRandom) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const move = this.selectRandomMove(player);
            this.thinking = false;
            const thinkingMessage = JSON.stringify({
                move_id: null,
                notation: 'デバッグ用（手は指しません）',
                reason: '開発・デバッグ目的のダミーモデルです。盤面や合法手の確認のみ行い、手は指しません。'
            });
            callback(move, thinkingMessage, false);
            return;
        }

        const prompt = this.createPromptForLLM(
            player,
            boardState,
            capturedPieces,
            gameHistory,
            legalMoves,
            modelKey
        );

        // 盤面＋持ち駒を画像化（必要なら後手視点で反転）
        const imageBase64 = this.captureBoardSnapshot(player === PLAYER.GOTE);

        const apiKey = model.name === 'Debug Dummy' ? 'DUMMY' : this.game.settings.getApiKey(modelKey);
        if (!apiKey) {
            this.thinking = false;
            callback(null, 'APIキーが設定されていません。設定画面で入力してください。', true);
            return;
        }

        try {
            const responseText = await this.sendRequestToLLM(model, apiKey, prompt, imageBase64);
            let move = this.extractMoveFromResponse(responseText, player, legalMoves);
            // デバッグダミーは指さない
            if (model.name === 'Debug Dummy') {
                move = { type: 'noop' };
            }
            this.thinking = false;

            if (move) {
                callback(move, responseText, false);
            } else {
                callback(null, responseText + '\n\n合法手を特定できませんでした。', true);
            }
        } catch (error) {
            console.error('LLM API error:', error);
            this.thinking = false;
            callback(null, `APIエラーが発生しました: ${error.message}`, true);
        }
    }

    /**
     * LLMで手を生成（生成式モード）
     * 合法手リストを与えず、自力で考えさせる
     */
    async generateMoveWithLLM(player, modelKey, callback) {
        this.thinking = true;
        this.currentModel = modelKey;

        const boardState = this.game.board.getBoardState();
        const capturedPieces = this.game.board.getCapturedPieces();
        const gameHistory = this.game.gameHistory;
        
        // 照合用に合法手を取得しておく
        const legalMoves = this.game.getAllPossibleMoves(player);
        if (!legalMoves.length) {
            this.thinking = false;
            callback(null, '合法手がありません（詰み/手詰まり）', true);
            return;
        }

        const model = LLM_MODELS[modelKey];
        
        // ランダムダミーは既存の処理へ委譲
        if (model && model.isRandom) {
            return this.selectMoveWithLLM(player, modelKey, callback);
        }

        const prompt = this.createPromptForGenerativeMode(
            player,
            boardState,
            capturedPieces,
            gameHistory,
            modelKey
        );

        const imageBase64 = this.captureBoardSnapshot(player === PLAYER.GOTE);
        const apiKey = this.game.settings.getApiKey(modelKey);
        
        if (!apiKey) {
            this.thinking = false;
            callback(null, 'APIキーが設定されていません。', true);
            return;
        }

        try {
            const responseText = await this.sendRequestToLLM(model, apiKey, prompt, imageBase64);
            
            // 既存の抽出ロジックを流用（notation からのマッチングを期待）
            // プロンプトで "notation" フィールドに標準棋譜（例: ７六歩）を書くように指示する
            const move = this.extractMoveFromResponse(responseText, player, legalMoves);
            
            this.thinking = false;

            if (move) {
                callback(move, responseText, false);
            } else {
                // 手が見つからない、または合法手リストにない（反則手）
                callback(null, responseText + '\n\nエラー: 指し手として解釈できない、または反則手（合法手リストに存在しない手）です。', true);
            }
        } catch (error) {
            console.error('LLM API error:', error);
            this.thinking = false;
            callback(null, `APIエラーが発生しました: ${error.message}`, true);
        }
    }

    /**
     * 生成モード用プロンプト
     * 合法手リストを含めず、棋譜表記での回答を求める
     */
    createPromptForGenerativeMode(player, boardState, capturedPieces, gameHistory, modelKey) {
        const turnText = player === PLAYER.SENTE ? '先手' : '後手';
        const roleText = `あなたは${turnText}です。`;
        const lastMove = gameHistory && gameHistory.length > 0 ? gameHistory[gameHistory.length - 1] : null;
        const lastMoveText = lastMove
            ? `直前の一手: ${lastMove.player === PLAYER.SENTE ? '先手' : '後手'} が ${this.moveToNotation(lastMove)}`
            : '直前の一手: まだありません';
        const inCheck = this.game.isPlayerInCheck(player);
        
        // 盤面表現の生成
        const sfen = this.generateSFEN(boardState);
        const asciiBoard = this.generateAsciiBoard(boardState);
        
        const historyText = this.formatHistory(gameHistory) || 'まだ指し手なし';
        const capturedText = `先手: ${this.formatCapturedPiecesForPrompt(capturedPieces[PLAYER.SENTE])}\n後手: ${this.formatCapturedPiecesForPrompt(capturedPieces[PLAYER.GOTE])}`;
        const thinkingDirective = this.getThinkingDirective(modelKey);

        const instruction = [
            'あなたはプロの棋士です。盤面を見て、次の一手を自力で考え、JSON形式で答えてください。',
            roleText,
            lastMoveText,
            `現在の手番: ${turnText}。現在王手: ${inCheck ? 'はい' : 'いいえ'}。`,
            thinkingDirective,
            '【重要】',
            '出力は必ず以下のJSON形式の1行のみとしてください。マークダウンや解説文をJSONの外に書かないでください。',
            '{"notation": "指し手", "reason": "理由"}',
            '',
            'notation（指し手）の形式:',
            '- 日本語の標準棋譜表記（例: "７六歩", "２二角成", "５二金右", "８八角成", "同銀"）',
            '- または USI/SFEN形式（例: "7g7f", "2b2a+", "5a5b"）',
            '- 必ず盤面の状況とルール（駒の動き、王手回避、打ち歩詰めなど）に従った「合法手」であること。',
            '',
            '例: {"notation": "７六歩", "reason": "角道を開け、攻めの足掛かりを作るため。"}',
            '',
            '【盤面情報】',
            'SFEN:',
            sfen,
            '',
            'テキスト盤面（vは後手の駒）:',
            asciiBoard,
            '',
            '【持ち駒】',
            capturedText,
            '【棋譜】',
            historyText,
            '画像: 盤面と持ち駒の最新スクリーンショットを添付しています。'
        ];

        return instruction.join('\n');
    }

    /**
     * プロンプト生成：盤面を正確かつ簡潔に伝える
     */
    createPromptForLLM(player, boardState, capturedPieces, gameHistory, legalMoves, modelKey) {
        const turnText = player === PLAYER.SENTE ? '先手' : '後手';
        const roleText = `あなたは${turnText}です。`;
        const lastMove = gameHistory && gameHistory.length > 0 ? gameHistory[gameHistory.length - 1] : null;
        const lastMoveText = lastMove
            ? `直前の一手: ${lastMove.player === PLAYER.SENTE ? '先手' : '後手'} が ${this.moveToNotation(lastMove)}`
            : '直前の一手: まだありません';
        const inCheck = this.game.isPlayerInCheck(player);
        // 盤面をSFEN風の簡潔JSONで渡す（square, owner, piece, promoted）
        const boardJson = this.buildBoardStateJson(boardState);
        // 合法手は全件渡す（制限しない）
        const legalMovesPayload = this.buildLegalMovesPayload(legalMoves);
        const historyText = this.formatHistory(gameHistory) || 'まだ指し手なし';
        const capturedText = `先手: ${this.formatCapturedPiecesForPrompt(capturedPieces[PLAYER.SENTE])}\n後手: ${this.formatCapturedPiecesForPrompt(capturedPieces[PLAYER.GOTE])}`;
        const thinkingDirective = this.getThinkingDirective(modelKey);

        const instruction = [
            'あなたははプロの棋士として将棋を指します。以下の合法手リストから最善の1手だけを選び、必ず1行JSONで返してください。',
            roleText,
            lastMoveText,
            `現在の手番: ${turnText}。現在王手: ${inCheck ? 'はい' : 'いいえ'}。王手を受けている場合は回避を最優先。`,
            thinkingDirective,
            '出力は1行JSONのみ（コードブロック禁止）。キー: move_id, notation, reason。',
            'reason は2〜3文で具体的に。狙い、受けの意図、手順の短い展開例を含めること。',
            '例: {"move_id": 3, "notation": "７六歩", "reason": "角道を開け主導権を取る。次に７五歩〜７四歩で飛車先を伸ばし、角交換の含みでプレッシャーをかける。自陣玉は６八銀〜７八金で早めに固める。"}',
            '【盤面(JSON)】',
            JSON.stringify(boardJson, null, 2),
            '【持ち駒】',
            capturedText,
            '【棋譜】',
            historyText,
            '【合法手リスト】',
            JSON.stringify(legalMovesPayload, null, 2),
            'ルール: move_idは上記リストのidのみ。出力は1行JSON。',
            '画像: 盤面と持ち駒の最新スクリーンショットを添付しています。必要なら併用して最善手を選んでください。'
        ];

        return instruction.join('\n');
    }

    /**
     * 盤面＋持ち駒を画像化し、Base64 dataURL を返す
     * flipForGote: 後手の場合は180度回転した画像を渡す
     */
    captureBoardSnapshot(flipForGote = false) {
        const boardCanvas = this.game.board.canvas;
        const capSente = this.game.board.capturedPieces[PLAYER.SENTE] || [];
        const capGote = this.game.board.capturedPieces[PLAYER.GOTE] || [];

        const w = boardCanvas.width;
        const boardH = boardCanvas.height;
        const capH = 40;
        const pad = 16;
        const h = capH * 2 + boardH + pad * 2;

        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const ctx = off.getContext('2d');

        // 背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#333';
        ctx.font = '16px sans-serif';

        // 持ち駒（後手）
        ctx.textBaseline = 'middle';
        ctx.fillText(`後手の持ち駒: ${this.formatCapturedPiecesForPrompt(capGote)}`, 8, capH / 2);

        // 盤面
        const boardY = capH + pad;
        if (flipForGote) {
            ctx.save();
            ctx.translate(w, boardY + boardH);
            ctx.rotate(Math.PI);
            ctx.drawImage(boardCanvas, 0, 0, w, boardH);
            ctx.restore();
        } else {
            ctx.drawImage(boardCanvas, 0, boardY);
        }

        // 持ち駒（先手）
        ctx.fillText(`先手の持ち駒: ${this.formatCapturedPiecesForPrompt(capSente)}`, 8, boardY + boardH + capH / 2 + pad);

        const dataUrl = off.toDataURL('image/png');
        // デバッグ用: 直近のスナップショットを参照できるように公開
        window.__lastBoardSnapshot = dataUrl;
        return dataUrl;
    }

    buildBoardStateJson(boardState) {
        const board = [];
        for (let row = 0; row < BOARD_SIZE.ROWS; row++) {
            for (let col = 0; col < BOARD_SIZE.COLS; col++) {
                const cell = boardState[row][col];
                board.push({
                    square: this.positionToSquare({ row, col }),
                    owner: cell.player === PLAYER.SENTE ? 'SENTE' : cell.player === PLAYER.GOTE ? 'GOTE' : null,
                    piece: cell.type === PIECE_TYPES.EMPTY ? null : PIECE_NAMES[cell.type],
                    promoted: [PIECE_TYPES.TO, PIECE_TYPES.NKYO, PIECE_TYPES.NKEI, PIECE_TYPES.NGIN, PIECE_TYPES.UMA, PIECE_TYPES.RYU].includes(cell.type)
                });
            }
        }
        return board;
    }

    /**
     * SFEN (Shogi Forsyth-Edwards Notation) 文字列を生成
     * 盤面配置のみ（手番や持ち駒は別途プロンプトで補完）
     */
    generateSFEN(boardState) {
        let sfen = "";
        const pieceMap = {
            [PIECE_TYPES.FU]: "P", [PIECE_TYPES.KYOSHA]: "L", [PIECE_TYPES.KEIMA]: "N", [PIECE_TYPES.GIN]: "S",
            [PIECE_TYPES.KIN]: "G", [PIECE_TYPES.KAKU]: "B", [PIECE_TYPES.HISHA]: "R", [PIECE_TYPES.GYOKU]: "K",
            [PIECE_TYPES.TO]: "+P", [PIECE_TYPES.NKYO]: "+L", [PIECE_TYPES.NKEI]: "+N", [PIECE_TYPES.NGIN]: "+S",
            [PIECE_TYPES.UMA]: "+B", [PIECE_TYPES.RYU]: "+R"
        };

        for (let row = 0; row < BOARD_SIZE.ROWS; row++) {
            let emptyCount = 0;
            for (let col = 0; col < BOARD_SIZE.COLS; col++) {
                const cell = boardState[row][col];
                if (cell.type === PIECE_TYPES.EMPTY) {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        sfen += emptyCount;
                        emptyCount = 0;
                    }
                    let char = pieceMap[cell.type] || "";
                    if (cell.player === PLAYER.GOTE) {
                        char = char.toLowerCase(); // 後手は小文字
                    }
                    sfen += char;
                }
            }
            if (emptyCount > 0) {
                sfen += emptyCount;
            }
            if (row < BOARD_SIZE.ROWS - 1) {
                sfen += "/";
            }
        }
        return sfen;
    }

    /**
     * テキスト形式の盤面（ASCII/日本語グリッド）を生成
     * 視覚的な配置をLLMに伝えるため
     */
    generateAsciiBoard(boardState) {
        const lines = [];
        lines.push("  ９ ８ ７ ６ ５ ４ ３ ２ １");
        lines.push("+---------------------------+");
        
        const rowChars = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

        for (let row = 0; row < BOARD_SIZE.ROWS; row++) {
            let line = "|";
            for (let col = 0; col < BOARD_SIZE.COLS; col++) {
                const cell = boardState[row][col];
                if (cell.type === PIECE_TYPES.EMPTY) {
                    line += " . ";
                } else {
                    let name = PIECE_NAMES[cell.type];
                    if (cell.type === PIECE_TYPES.TO) name = "と"; // 1文字化
                    else if (cell.type === PIECE_TYPES.NKYO) name = "杏";
                    else if (cell.type === PIECE_TYPES.NKEI) name = "圭";
                    else if (cell.type === PIECE_TYPES.NGIN) name = "全";
                    else if (cell.type === PIECE_TYPES.UMA) name = "馬";
                    else if (cell.type === PIECE_TYPES.RYU) name = "龍";
                    
                    const mark = cell.player === PLAYER.SENTE ? " " : "v"; // 先手は空白、後手はv
                    line += `${mark}${name}`;
                }
            }
            line += `|${rowChars[row]}`;
            lines.push(line);
        }
        lines.push("+---------------------------+");
        return lines.join("\n");
    }

    buildLegalMovesPayload(legalMoves) {
        return legalMoves.map((move, index) => ({
            id: index + 1,
            type: move.type,
            piece: PIECE_NAMES[move.pieceType],
            from: move.type === 'move' ? this.positionToSquare(move.from) : null,
            to: this.positionToSquare(move.to),
            promote: !!move.promote,
            notation: this.moveToNotation(move)
        }));
    }

    positionToSquare(pos) {
        const cols = ['９','８','７','６','５','４','３','２','１'];
        const rows = ['一','二','三','四','五','六','七','八','九'];
        return `${cols[pos.col]}${rows[pos.row]}`;
    }

    moveToNotation(move) {
        const pieceName = PIECE_NAMES[move.pieceType];
        const to = this.positionToSquare(move.to);
        if (move.type === 'drop') {
            return `${to}${pieceName}打`;
        }
        const from = this.positionToSquare(move.from);
        const promote = move.promote ? '成' : '';
        return `${from}${pieceName}${to}${promote}`;
    }

    /**
     * 一般的な棋譜表記（移動元を含まない）を生成する
     * 例: ７六歩, ２二角成, 同歩
     */
    createSimpleNotation(move, lastMoveTo = null) {
        const pieceName = PIECE_NAMES[move.pieceType];
        const promote = move.promote ? '成' : '';
        
        // 直前の指し手と同じ場所なら「同」を使う
        if (lastMoveTo && move.to.row === lastMoveTo.row && move.to.col === lastMoveTo.col) {
            return `同${pieceName}${promote}`;
        }

        const to = this.positionToSquare(move.to);
        if (move.type === 'drop') {
            return `${to}${pieceName}打`;
        }
        // 移動元を含まない表記（相対情報なし）
        return `${to}${pieceName}${promote}`;
    }

    formatCapturedPiecesForPrompt(capturedPieces) {
        if (!capturedPieces || capturedPieces.length === 0) return 'なし';
        const pieceGroups = {};
        capturedPieces.forEach(piece => {
            pieceGroups[piece.type] = (pieceGroups[piece.type] || 0) + 1;
        });
        return Object.entries(pieceGroups)
            .map(([type, count]) => (count > 1 ? `${PIECE_NAMES[type]}×${count}` : PIECE_NAMES[type]))
            .join('、');
    }

    formatHistory(gameHistory) {
        if (!gameHistory || gameHistory.length === 0) return '';
        return gameHistory
            .map((move, index) => {
                const moveNumber = Math.floor(index / 2) + 1;
                const playerMark = move.player === PLAYER.SENTE ? '▲' : '△';
                return `${moveNumber}. ${playerMark}${this.moveToNotation(move)}`;
            })
            .join('\n');
    }

    /**
     * LLM API送信
     */
    async sendRequestToLLM(model, apiKey, prompt, imageBase64) {
        switch (model.name) {
            case 'GPT-5.1 Low':
            case 'GPT-5.1 Medium':
            case 'GPT-5.1 High':
                return this.sendRequestToOpenAI(model, apiKey, prompt, imageBase64);
            case 'Debug Dummy':
                return this.sendRequestToDummy(prompt);
            case 'Gemini Flash':
            case 'Gemini Flash Thinking':
            case 'Gemini 3 Pro high':
            case 'Gemini 3 Pro low':
                return this.sendRequestToGemini(model, apiKey, prompt, imageBase64);
            default:
                throw new Error(`未対応のモデル: ${model.name}`);
        }
    }

    async sendRequestToOpenAI(model, apiKey, prompt, imageBase64) {
        const body = {
            model: model.model,
            messages: [
                { role: 'system', content: 'あなたは将棋の指し手を返すAIです。合法手リストに従い、JSON1行のみで回答してください。' },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        imageBase64 ? { type: 'image_url', image_url: { url: imageBase64 } } : null
                    ].filter(Boolean)
                }
            ],
            stream: true
        };
        if (model.model === 'gpt-5.1' && model.reasoningEffort) {
            body.reasoning_effort = model.reasoningEffort;
        } else {
            body.temperature = 0.2;
        }

        const res = await fetch(model.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error?.message || 'OpenAI API error');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let fullContent = '';

        if (this.game?.onAiThinkingUpdate) {
            this.game.onAiThinkingUpdate('思考中...', this.game.currentPlayer, model.name);
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                try {
                    const jsonStr = trimmed.replace(/^data: /, '').trim();
                    if (!jsonStr) continue;
                    const json = JSON.parse(jsonStr);
                    const delta = json.choices?.[0]?.delta;
                    if (delta?.content) {
                        fullContent += delta.content;
                        if (this.game?.onAiThinkingUpdate) {
                            this.game.onAiThinkingUpdate(fullContent, this.game.currentPlayer, model.name);
                        }
                    }
                } catch (e) {
                    console.warn('stream parse error', e);
                }
            }
        }

        if (!fullContent) throw new Error('応答が空でした');
        return fullContent;
    }

    async sendRequestToGemini(model, apiKey, prompt, imageBase64) {
        const generationConfig = {};
        if (model.thinkingMode) {
            generationConfig.thinkingConfig = {
                thinkingBudget: model.thinkingMode === 'on' ? -1 : 0
            };
        }
        if (model.thinkingLevel) {
            generationConfig.thinkingConfig = {
                thinkingLevel: model.thinkingLevel
            };
        }

        // Gemini 画像部品用に Base64 部分だけ抽出
        let inlineImage = null;
        if (imageBase64) {
            const base64 = imageBase64.replace(/^data:image\/png;base64,/, '');
            inlineImage = { inline_data: { mime_type: 'image/png', data: base64 } };
        }

        const res = await fetch(model.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
                model: model.model,
                contents: [{ role: 'user', parts: inlineImage ? [{ text: prompt }, inlineImage] : [{ text: prompt }] }],
                generationConfig,
                safetySettings: []
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error?.message || 'Gemini API error');
        }

        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Gemini応答を取得できませんでした');
        if (this.game?.onAiThinkingUpdate) {
            this.game.onAiThinkingUpdate(text, this.game.currentPlayer, model.name);
        }
        return text;
    }

    /** ダミーモデル: 固定レスポンス */
    async sendRequestToDummy(prompt) {
        return JSON.stringify({
            move_id: null,
            notation: 'デバッグ用（手は指しません）',
            reason: '開発・デバッグ目的のダミーモデルです。盤面や合法手の確認のみ行い、手は指しません。'
        });
    }

    extractMoveFromResponse(response, player, legalMoves) {
        // 直前の指し手の位置を取得（「同」の判定用）
        let lastMoveTo = null;
        if (this.game && this.game.gameHistory && this.game.gameHistory.length > 0) {
            lastMoveTo = this.game.gameHistory[this.game.gameHistory.length - 1].to;
        }

        const parsed = this.tryParseJson(response);
        const normalizedLegal = legalMoves.map((m, idx) => {
            const simple = this.createSimpleNotation(m, lastMoveTo);
            return {
                idx,
                move: m,
                norm: this.normalizeNotation(this.moveToNotation(m)),
                simpleNorm: this.normalizeNotation(simple), // 「同」対応の簡易表記
                dropNorm: m.type === 'drop' ? this.normalizeNotation(simple.replace('打', '')) : null // 「打」省略表記
            };
        });

        if (parsed) {
            const rawId = parsed.move_id ?? parsed.id ?? parsed.choice ?? parsed.moveId ?? parsed.index;
            const id = typeof rawId === 'number' ? rawId : parseInt(rawId, 10);
            if (!isNaN(id) && legalMoves[id - 1]) {
                return legalMoves[id - 1];
            }
            if (parsed.notation) {
                const norm = this.normalizeNotation(parsed.notation);
                
                // 1. 完全一致
                let hit = normalizedLegal.find(e => e.norm === norm);
                if (hit) return hit.move;

                // 2. 簡易一致
                hit = normalizedLegal.find(e => e.simpleNorm === norm);
                if (hit) return hit.move;

                // 3. 打つ手の「打」省略一致
                hit = normalizedLegal.find(e => e.dropNorm === norm);
                if (hit) return hit.move;
            }
        }

        const idMatch = response.match(/move_id\s*[:=]\s*(\d+)/i);
        if (idMatch) {
            const id = parseInt(idMatch[1], 10);
            if (!isNaN(id) && legalMoves[id - 1]) return legalMoves[id - 1];
        }

        const moveMatch = response.match(/指し手[:：]\s*(.+?)(?:$|\n)/);
        if (moveMatch) {
            const norm = this.normalizeNotation(moveMatch[1].trim());
            let hit = normalizedLegal.find(e => e.norm === norm);
            if (hit) return hit.move;
            
            hit = normalizedLegal.find(e => e.simpleNorm === norm);
            if (hit) return hit.move;

            hit = normalizedLegal.find(e => e.dropNorm === norm);
            if (hit) return hit.move;
        }

        return null;
    }

    tryParseJson(text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        try {
            return JSON.parse(jsonMatch[0]);
        } catch {
            return null;
        }
    }

    normalizeNotation(str) {
        if (!str) return '';
        const zenkakuNums = '０１２３４５６７８９';
        const hankakuNums = '0123456789';
        let s = str
            .replace(/[０-９]/g, c => hankakuNums[zenkakuNums.indexOf(c)])
            .replace(/→|↦|⇒|→|ー|->/g, '->')
            .replace(/[　\s]/g, '');
        s = s.replace(/[▲△]/g, '');
        return s;
    }

    getThinkingDirective(modelKey) {
        if (!this.game || !this.game.settings) return '';
        if (modelKey === 'GEMINI3_PRO_HIGH' || modelKey === 'GEMINI3_PRO_LOW') {
            const level = modelKey.endsWith('HIGH') ? 'high' : 'low';
            return `思考レベル: ${level}。reasonは2〜3文で具体的に（狙い・受けの意図・手順の短い展開例を含める）。出力は1行JSONのみ。`;
        }
        if (modelKey === 'GEMINI_FLASH_THINK' || modelKey === 'GEMINI_FLASH') {
            const mode = modelKey === 'GEMINI_FLASH_THINK' ? 'on' : 'off';
            return `思考モード: ${mode}。reasonは2〜3文で具体的に（狙い・受けの意図・短い展開例）。出力は1行JSONのみ。`;
        }
        return '';
    }

    isMoveInLegalMovesList(move, legalMoves) {
        return legalMoves?.some(m =>
            m.type === move.type &&
            (m.type === 'move'
                ? m.from.row === move.from.row &&
                  m.from.col === move.from.col &&
                  m.to.row === move.to.row &&
                  m.to.col === move.to.col &&
                  m.promote === move.promote
                : m.pieceType === move.pieceType &&
                  m.to.row === move.to.row &&
                  m.to.col === move.to.col)
        );
    }

    isValidMove(move, player) {
        if (!move) return false;
        if (move.type === 'move') {
            return MoveValidator.isValidMove(this.game.board.board, move.from, move.to, player);
        }
        if (move.type === 'drop') {
            return MoveValidator.canDropPiece(this.game.board.board, move.to, move.pieceType, player);
        }
        return false;
    }
}

// グローバルに公開（main.js から参照）
window.Bot = Bot;
