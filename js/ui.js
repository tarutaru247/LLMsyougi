/**
 * UIレイヤーを管理するクラス
 */
class UI {
    /**
     * @param {Game} game - ゲームインスタンス
     */
    constructor(game) {
        this.game = game;
        this.aiThinkingHistory = [];
        this.aiThinkingIndicator = null;

        // DOM参照
        this.gameStatusElement = document.getElementById('gameStatus');
        this.gameRecordElement = document.getElementById('gameRecord');
        this.capturedPiecesSenteElement = document.getElementById('capturedPiecesSente');
        this.capturedPiecesGoteElement = document.getElementById('capturedPiecesGote');
        this.newGameButton = document.getElementById('newGameBtn');
        this.undoButton = document.getElementById('undoBtn');
        this.gameModeSelect = document.getElementById('gameMode');
        this.settingsButton = document.getElementById('openApiSettingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeModalButton = document.querySelector('.close');
        this.saveApiSettingsLocalButton = document.getElementById('saveApiSettingsLocal');
        this.saveApiSettingsSessionButton = document.getElementById('saveApiSettingsSession');
        this.aiThinkingElement = document.getElementById('aiThinking');
        this.aiErrorRetryButton = null;
        this.aiTitle = document.querySelector('.ai-thinking-title');

        this.promotionDialog = null;

        // 既存の思考中インジケータがあれば除去し、初期状態で非表示にする
        const existingIndicator = document.querySelector('.ai-thinking-indicator');
        if (existingIndicator && existingIndicator.parentNode) {
            existingIndicator.parentNode.removeChild(existingIndicator);
        }
        this.aiThinkingIndicator = null;

        this.setupEventListeners();
        this.setupGameEventHandlers();
        this.updateCapturedPieces();
    }

    /** イベントリスナー設定 */
    setupEventListeners() {
        this.newGameButton.addEventListener('click', () => this.game.initialize());
        this.undoButton.addEventListener('click', () => this.game.undoMove());
        this.gameModeSelect.addEventListener('change', () => {
            this.game.setGameMode(this.gameModeSelect.value);
        });

        if (this.settingsButton) {
            this.settingsButton.addEventListener('click', () => this.openSettingsModal());
        }
        if (this.closeModalButton) {
            this.closeModalButton.addEventListener('click', () => this.closeSettingsModal());
        }
        if (this.saveApiSettingsLocalButton) {
            this.saveApiSettingsLocalButton.addEventListener('click', () => this.saveApiSettings('local'));
        }
        if (this.saveApiSettingsSessionButton) {
            this.saveApiSettingsSessionButton.addEventListener('click', () => this.saveApiSettings('session'));
        }
    }

    /** Game 側のイベントハンドラ設定 */
    setupGameEventHandlers() {
        this.game.onGameStateUpdate = (state) => this.updateGameStatus(state);
        this.game.onGameRecordUpdate = (history) => this.updateGameRecord(history);
        this.game.onPromotionDialogOpen = (fromPos, toPos) => this.showPromotionDialog(fromPos, toPos);
        this.game.onCapturedPiecesUpdate = () => this.updateCapturedPieces();
        this.game.onAiThinkingUpdate = (content) => this.updateAiThinking(content);
        this.game.onAiError = (errorMessage) => this.handleAiError(errorMessage);
    }

    /** ゲーム状態表示 */
    updateGameStatus(state) {
        let statusText = '';
        if (state.gameResult) {
            statusText = state.gameResult === 'sente_win' ? '先手の勝ちです' : '後手の勝ちです';
        } else if (state.aiThinking) {
            statusText = 'AIが思考中...';
        } else {
            statusText = (state.currentPlayer === PLAYER.SENTE ? '先手' : '後手') + 'の手番です';
        }
        if (this.gameStatusElement) {
            this.gameStatusElement.textContent = statusText;
        }
    }

    /** 棋譜表示を更新 */
    updateGameRecord(gameHistory) {
        if (!this.gameRecordElement) return;
        this.gameRecordElement.innerHTML = '';
        gameHistory.forEach((move, index) => {
            const el = document.createElement('div');
            el.className = 'move-record';
            el.dataset.index = index;
            const moveNumber = Math.floor(index / 2) + 1;
            const playerMark = move.player === PLAYER.SENTE ? '▲' : '△';
            let moveText = '';
            const toRowMap = ['一','二','三','四','五','六','七','八','九'];
            if (move.type === 'move') {
                const pieceName = PIECE_NAMES[move.pieceType];
                const toCol = 9 - move.to.col;
                const toRow = toRowMap[move.to.row];
                moveText = `${playerMark}${toCol}${toRow}${pieceName}`;
                if (move.promote) moveText += '成';
                if (move.capture) moveText += '(取)';
            } else if (move.type === 'drop') {
                const pieceName = PIECE_NAMES[move.pieceType];
                const toCol = 9 - move.to.col;
                const toRow = toRowMap[move.to.row];
                moveText = `${playerMark}${toCol}${toRow}${pieceName}打`;
            }
            el.textContent = `${moveNumber}. ${moveText}`;
            el.addEventListener('click', () => {
                this.game.replayMove(index);
                document.querySelectorAll('.move-record.current-move').forEach(x => x.classList.remove('current-move'));
                el.classList.add('current-move');
            });
            this.gameRecordElement.appendChild(el);
        });
    }

    updateCapturedPieces() {
        this.updateCapturedPiecesForPlayer(PLAYER.SENTE);
        this.updateCapturedPiecesForPlayer(PLAYER.GOTE);
    }

    updateCapturedPiecesForPlayer(player) {
        const element = player === PLAYER.SENTE ? this.capturedPiecesSenteElement : this.capturedPiecesGoteElement;
        if (!element) return;
        element.innerHTML = '';
        const capturedPieces = this.game.board.capturedPieces[player] || [];
        capturedPieces.forEach((piece, idx) => {
            const pieceName = PIECE_NAMES[piece.type];
            const pieceElement = document.createElement('div');
            pieceElement.className = 'captured-piece';
            pieceElement.dataset.index = idx;
            pieceElement.style.cursor = 'pointer';
            pieceElement.textContent = pieceName;
            pieceElement.addEventListener('click', () => {
                const index = parseInt(pieceElement.dataset.index, 10);
                this.game.handleCapturedPieceClick(player, index);
                this.updateCapturedPieces();
            });
            if (this.game.selectedCapturedPiece &&
                this.game.selectedCapturedPiece.player === player &&
                this.game.selectedCapturedPiece.index === idx) {
                pieceElement.classList.add('selected');
            }
            element.appendChild(pieceElement);
        });
    }

    showPromotionDialog(fromPos, toPos) {
        if (this.promotionDialog) {
            document.body.removeChild(this.promotionDialog);
        }
        const dialog = document.createElement('div');
        dialog.className = 'promotion-dialog';
        const boardRect = this.game.board.canvas.getBoundingClientRect();
        const cellSize = this.game.board.cellSize;
        const boardMargin = this.game.board.boardMargin;
        dialog.style.left = `${boardRect.left + boardMargin + toPos.col * cellSize}px`;
        dialog.style.top = `${boardRect.top + boardMargin + toPos.row * cellSize}px`;

        const piece = this.game.board.board[fromPos.row][fromPos.col];
        const pieceName = PIECE_NAMES[piece.type];
        const promotedPieceName = PIECE_NAMES[PROMOTION_MAP[piece.type]];

        const message = document.createElement('div');
        message.textContent = `${pieceName}を成りますか？`;
        dialog.appendChild(message);

        const promoteButton = document.createElement('button');
        promoteButton.textContent = `成る (${promotedPieceName})`;
        promoteButton.addEventListener('click', () => {
            this.game.handlePromotionDialogResult(true);
            document.body.removeChild(dialog);
            this.promotionDialog = null;
        });
        dialog.appendChild(promoteButton);

        const dontPromoteButton = document.createElement('button');
        dontPromoteButton.textContent = `成らない (${pieceName})`;
        dontPromoteButton.addEventListener('click', () => {
            this.game.handlePromotionDialogResult(false);
            document.body.removeChild(dialog);
            this.promotionDialog = null;
        });
        dialog.appendChild(dontPromoteButton);

        document.body.appendChild(dialog);
        this.promotionDialog = dialog;
    }

    openSettingsModal() {
        this.loadApiSettings();
        if (this.settingsModal) this.settingsModal.style.display = 'block';
    }

    closeSettingsModal() {
        if (this.settingsModal) this.settingsModal.style.display = 'none';
    }

    loadApiSettings() {
        Object.values(LLM_MODELS).forEach(model => {
            const input = document.getElementById(model.keyName);
            if (!input) return;
            const key = window.settings?.apiKeys?.[model.keyName] || '';
            input.value = key;
        });
        const g3 = document.getElementById('gemini3Thinking');
        if (g3 && window.settings) g3.value = window.settings.getGemini3Thinking();
        const gf = document.getElementById('geminiFlashThinking');
        if (gf && window.settings) gf.value = window.settings.getGeminiFlashThinking();
    }

    /**
     * API設定を保存
     * @param {'local'|'session'} mode
     */
    saveApiSettings(mode = 'local') {
        const uniqueKeys = Array.from(new Set(Object.values(LLM_MODELS).map(m => m.keyName)));
        uniqueKeys.forEach(keyName => {
            const input = document.getElementById(keyName);
            const key = input ? input.value : '';
            if (key) {
                window.settings.apiKeys[keyName] = key;
            } else {
                window.settings.apiKeys[keyName] = null;
            }
        });
        window.settings.saveSettings(mode);
        this.closeSettingsModal();
        const msg = mode === 'session'
            ? 'APIキーを一時的に保存しました（このタブを閉じると消えます）'
            : 'APIキーをブラウザに保存しました（localStorage）';
        alert(msg);
    }

    /**
     * AI思考内容を表示（履歴を保持）
     */
        updateAiThinking(content) {
        if (!this.aiThinkingElement) return;

        const parsed = this.tryParseMoveJson(content);
        if (parsed) {
            this.aiThinkingHistory.push(parsed);
            if (this.aiThinkingHistory.length > 30) this.aiThinkingHistory.shift();
            this.hideThinkingIndicator();
            this.renderThinkingHistory();
        } else {
            if (!content) {
                this.hideThinkingIndicator();
                if (this.aiThinkingHistory.length > 0) {
                    this.renderThinkingHistory();
                } else {
                    this.aiThinkingElement.textContent = '';
                }
                return;
            }

            const text = this.sanitizeText(content);
            this.showThinkingIndicator(text || '思考中…');
            if (this.aiThinkingHistory.length > 0) {
                this.renderThinkingHistory();
            } else {
                this.aiThinkingElement.textContent = '';
            }
        }
    }

    /** AI表示クリア（履歴もクリア） */
    hideAiThinking() {
        if (this.aiThinkingElement) {
            this.aiThinkingElement.textContent = '';
        }
        this.aiThinkingHistory = [];
        this.hideThinkingIndicator();
    }

    /** AIエラー表示（履歴は保持） */
    handleAiError(errorMessage) {
        const safeText = this.sanitizeText(errorMessage || 'AIエラーが発生しました');
        if (this.aiThinkingElement) {
            this.aiThinkingElement.textContent = safeText;
        }
        this.hideThinkingIndicator();
    }

    /** 値を安全な文字列に変換 */
    sanitizeText(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value;
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

    /** AI応答から move_id / notation / reason を持つJSONを抜き出す */
    tryParseMoveJson(text) {
        if (!text) return null;
        let target = text;
        if (typeof text !== 'string') {
            try {
                target = JSON.stringify(text);
            } catch {
                return null;
            }
        }
        const match = target.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            const obj = JSON.parse(match[0]);
            if (obj && (obj.move_id !== undefined || obj.notation || obj.reason)) {
                return obj;
            }
        } catch {
            return null;
        }
        return null;
    }

    /** moveカードを生成（すべて textContent で安全表示） */
    createMoveBlock(parsed, isLatest = false) {
        const wrap = document.createElement('div');
        wrap.className = 'ai-move-block' + (isLatest ? ' latest' : '');

        const metaId = document.createElement('p');
        metaId.className = 'ai-move-meta';
        const idLabel = document.createElement('span');
        idLabel.className = 'ai-label';
        idLabel.textContent = 'move_id';
        const idVal = document.createElement('span');
        idVal.textContent = this.sanitizeText(parsed.move_id ?? '');
        metaId.appendChild(idLabel);
        metaId.appendChild(idVal);

        const metaNotation = document.createElement('p');
        metaNotation.className = 'ai-move-meta';
        const notationLabel = document.createElement('span');
        notationLabel.className = 'ai-label';
        notationLabel.textContent = 'notation';
        const notationVal = document.createElement('span');
        notationVal.textContent = this.sanitizeText(parsed.notation ?? '');
        metaNotation.appendChild(notationLabel);
        metaNotation.appendChild(notationVal);

        const reason = document.createElement('div');
        reason.className = 'ai-move-reason';
        reason.textContent = this.sanitizeText(parsed.reason ?? '');

        wrap.appendChild(metaId);
        wrap.appendChild(metaNotation);
        wrap.appendChild(reason);
        return wrap;
    }

    /** 履歴をまとめて描画（最新だけ強調） */
    renderThinkingHistory() {
        if (!this.aiThinkingElement) return;
        this.aiThinkingElement.innerHTML = '';
        const len = this.aiThinkingHistory.length;
        if (len === 0) {
            this.aiThinkingElement.textContent = '思考履歴はありません';
            return;
        }
        this.aiThinkingHistory.forEach((entry, idx) => {
            const block = this.createMoveBlock(entry, idx === len - 1);
            this.aiThinkingElement.appendChild(block);
        });
        this.aiThinkingElement.scrollTop = this.aiThinkingElement.scrollHeight;
    }

    /** 思考中インジケータ（タイトル横）表示 */
    showThinkingIndicator(text = '思考中...') {
        if (!this.aiTitle) return;
        if (!this.aiThinkingIndicator) {
            this.aiThinkingIndicator = document.createElement('span');
            this.aiThinkingIndicator.className = 'ai-thinking-indicator';
            this.aiTitle.appendChild(this.aiThinkingIndicator);
        }
        this.aiThinkingIndicator.textContent = ` (${text})`;
    }

    hideThinkingIndicator() {
        if (this.aiThinkingIndicator && this.aiThinkingIndicator.parentNode) {
            this.aiThinkingIndicator.parentNode.removeChild(this.aiThinkingIndicator);
        }
        this.aiThinkingIndicator = null;
    }
}

