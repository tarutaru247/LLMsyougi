/**
 * 将棋の指し手を担当するBOTクラス
 * 盤面情報をLLMへ渡し、返答から合法手を選択する。
 */
class Bot {
    constructor(game) {
        this.game = game;
        this.thinking = false;
        this.currentModel = null;
    }

    /**
     * デバッグ用ランダム手
     */
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

        // 合法手が無い場合は詰み/手詰まりとみなし終了
        if (!legalMoves.length) {
            this.thinking = false;
            callback(null, '合法手がありません（詰み/手詰まり）', true);
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

        const model = LLM_MODELS[modelKey];

        // ランダムダミーはAPI呼び出しを行わずランダム手＋1秒ディレイ
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

        const apiKey = model.name === 'Debug Dummy' ? 'DUMMY' : this.game.settings.getApiKey(modelKey);
        if (!apiKey) {
            this.thinking = false;
            callback(null, 'APIキーが設定されていません。設定画面で入力してください。', true);
            return;
        }

        try {
            const responseText = await this.sendRequestToLLM(model, apiKey, prompt);
            let move = this.extractMoveFromResponse(responseText, player, legalMoves);
            // ダミーモデルは手を指さない
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
     * プロンプト生成
     */
    createPromptForLLM(player, boardState, capturedPieces, gameHistory, legalMoves, modelKey) {
        const turnText = player === PLAYER.SENTE ? '先手（下手）' : '後手（上手）';
        const inCheck = this.game.isPlayerInCheck(player);
        const boardJson = this.buildBoardStateJson(boardState);
        const legalMovesPayload = this.buildLegalMovesPayload(legalMoves);
        const historyText = this.formatHistory(gameHistory);
        const capturedText = `先手: ${this.formatCapturedPiecesForPrompt(capturedPieces[PLAYER.SENTE])}\n後手: ${this.formatCapturedPiecesForPrompt(capturedPieces[PLAYER.GOTE])}`;
        const thinkingDirective = this.getThinkingDirective(modelKey);

        const instruction = [
            'あなたは将棋の指し手選択エージェントです。',
            `現在の手番: ${turnText}。以下の合法手リストから必ず1手だけ選びます。`,
            `現在王手: ${inCheck ? 'はい' : 'いいえ'}。もし「はい」なら必ず王手を回避する手を選ぶこと。`,
            thinkingDirective,
            '出力フォーマットは **1 行の JSON のみ**。他の文字・改行・コードブロックは禁止。',
            '必須キー: move_id（合法手リストの id のみ）, notation（人間可読の指し手）, reason（その手を選んだ理由を1〜2文）',
            '例: {"move_id": 3, "notation": "７六歩", "reason": "角道を開けて先手攻撃を準備する"}',
            'reason は内容を厚くし、2〜4文で具体的な狙いと変化例を簡潔に説明すること（現在より約2倍の分量）。',
            '',
            '【盤面(JSON形式)】',
            JSON.stringify(boardJson, null, 2),
            '',
            '【盤面(図)】',
            this.formatBoardStateForPrompt(boardState),
            '',
            '【持ち駒】',
            capturedText,
            '',
            '【棋譜】',
            historyText || '（まだ指し手なし）',
            '',
            '【合法手リスト】',
            JSON.stringify(legalMovesPayload, null, 2),
            '',
            'ルール（厳守）:',
            '- move_id は上の合法手リストの id のみを使う（範囲外は無効）',
            '- 出力は1行JSONのみ。コードブロックや追加の文章は禁止',
            '- notation は人間が読む指し手表記、reason は理由を簡潔に1〜2文'
        ];

        return instruction.join('\n');
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
        const cols = ['９', '８', '７', '６', '５', '４', '３', '２', '１'];
        const rows = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
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
        return `${from}${pieceName}→${to}${promote}`;
    }

    formatBoardStateForPrompt(boardState) {
        let result = '   ９８７６５４３２１\n';
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

    async sendRequestToLLM(model, apiKey, prompt) {
        switch (model.name) {
            case 'GPT-5.1 Low':
            case 'GPT-5.1 Medium':
            case 'GPT-5.1 High':
                return this.sendRequestToOpenAI(model, apiKey, prompt);
            case 'Debug Dummy':
                return this.sendRequestToDummy(prompt);
            case 'Gemini Flash':
            case 'Gemini Flash Thinking':
            case 'Gemini 3 Pro high':
            case 'Gemini 3 Pro low':
                return this.sendRequestToGemini(model, apiKey, prompt);
            default:
                throw new Error(`未対応のモデル: ${model.name}`);
        }
    }

    async sendRequestToOpenAI(model, apiKey, prompt) {
        const body = {
            model: model.model,
            messages: [
                { role: 'system', content: 'あなたは将棋の指し手を返すAIです。合法手リストに必ず従い、JSON一行のみで回答してください。' },
                { role: 'user', content: prompt }
            ],
            stream: true
        };
        // GPT-5.1: reasoning_effort を使用。temperature/top_p は併用しない。
        if (model.model === 'gpt-5.1' && model.reasoningEffort) {
            body.reasoning_effort = model.reasoningEffort; // 'low'|'medium'|'high'
        } else {
            // 旧モデルのみ温度を設定
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
            this.game.onAiThinkingUpdate('思考中...');
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
                            this.game.onAiThinkingUpdate(fullContent);
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

    async sendRequestToGemini(model, apiKey, prompt) {
        const generationConfig = {};
        if (model.thinkingMode) {
            // Flash Thinking: on/off → thinkingBudget
            generationConfig.thinkingConfig = {
                thinkingBudget: model.thinkingMode === 'on' ? -1 : 0
            };
        }
        if (model.thinkingLevel) {
            // 3 Pro high/low
            generationConfig.thinkingConfig = {
                thinkingLevel: model.thinkingLevel
            };
        }

        const res = await fetch(model.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
                model: model.model,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
            this.game.onAiThinkingUpdate(text);
        }
        return text;
    }

    /**
     * ダミーモデル: API呼び出しなしで固定レスポンスを返す
     */
    async sendRequestToDummy(prompt) {
        return JSON.stringify({
            move_id: null,
            notation: 'デバッグ用（手は指しません）',
            reason: '開発・デバッグ目的のダミーモデルです。盤面や合法手の確認のみ行い、手は指しません。'
        });
    }

    extractMoveFromResponse(response, player, legalMoves) {
        const parsed = this.tryParseJson(response);
        const normalizedLegal = legalMoves.map((m, idx) => ({
            idx,
            move: m,
            norm: this.normalizeNotation(this.moveToNotation(m))
        }));

        if (parsed) {
            const rawId = parsed.move_id ?? parsed.id ?? parsed.choice ?? parsed.moveId ?? parsed.index;
            const id = typeof rawId === 'number' ? rawId : parseInt(rawId, 10);
            if (!isNaN(id) && legalMoves[id - 1]) {
                return legalMoves[id - 1];
            }
            if (parsed.notation) {
                const norm = this.normalizeNotation(parsed.notation);
                const hit = normalizedLegal.find(e => e.norm === norm);
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
            const hit = normalizedLegal.find(e => e.norm === norm);
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
            .replace(/→|↦|⇒|－|ー|->/g, '->')
            .replace(/[　\s]/g, '');
        s = s.replace(/[▲△]/g, '');
        return s;
    }

    /**
     * モデル別の思考指示を返す
     */
    getThinkingDirective(modelKey) {
        if (!this.game || !this.game.settings) return '';
        if (modelKey === 'GEMINI3_PRO_HIGH' || modelKey === 'GEMINI3_PRO_LOW') {
            const level = modelKey.endsWith('HIGH') ? 'high' : 'low';
            return `思考レベル: ${level}（${level === 'high' ? '詳細に' : '簡潔に'}理由を記述。出力は1行JSONのみ）`;
        }
        if (modelKey === 'GEMINI_FLASH_THINK' || modelKey === 'GEMINI_FLASH') {
            const mode = modelKey === 'GEMINI_FLASH_THINK' ? 'on' : 'off';
            if (mode === 'on') {
                return '思考モード: on（reasonに短い思考要約を含める）。出力は1行JSONのみ。';
            } else {
                return '思考モード: off（reasonは簡潔に）。出力は1行JSONのみ。';
            }
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
