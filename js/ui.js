/**
 * ユーザーインターフェースを管理するクラス
 */
class UI {
    /**
     * UIのインスタンスを作成
     * @param {Game} game - ゲームのインスタンス
     */
    constructor(game) {
        this.game = game;
        
        // DOM要素
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
        this.saveApiSettingsButton = document.getElementById('saveApiSettings');
        this.aiThinkingElement = document.getElementById('aiThinking');
        this.aiErrorRetryButton = null; // やり直しボタンの参照

        // 成り駒ダイアログ
        this.promotionDialog = null;
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // ゲームイベントハンドラの設定
        this.setupGameEventHandlers();
        
        // 持ち駒の表示を更新
        this.updateCapturedPieces();
    }
    
    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // 新規ゲームボタン
        this.newGameButton.addEventListener('click', () => {
            this.game.initialize();
        });
        
        // 待ったボタン
        this.undoButton.addEventListener('click', () => {
            this.game.undoMove();
        });
        
        // ゲームモード選択
        this.gameModeSelect.addEventListener('change', () => {
            this.game.setGameMode(this.gameModeSelect.value);
        });
        
        // API設定ボタン
        if (this.settingsButton) {
            this.settingsButton.addEventListener('click', () => {
                this.openSettingsModal();
            });
        }

        // モーダルを閉じるボタン
        if (this.closeModalButton) {
            this.closeModalButton.addEventListener('click', () => {
                this.closeSettingsModal();
            });
        }
        
        // API設定保存ボタン
        this.saveApiSettingsButton.addEventListener('click', () => {
            this.saveApiSettings();
        });
    }
    
    /**
     * ゲームイベントハンドラを設定
     */
    setupGameEventHandlers() {
        this.game.onGameStateUpdate = (state) => {
            this.updateGameStatus(state);
        };
        this.game.onGameRecordUpdate = (gameHistory) => {
            this.updateGameRecord(gameHistory);
        };
        this.game.onPromotionDialogOpen = (fromPos, toPos) => {
            this.showPromotionDialog(fromPos, toPos);
        };
        this.game.onCapturedPiecesUpdate = () => {
            this.updateCapturedPieces();
        };
        this.game.onAiThinkingUpdate = (content) => {
            this.updateAiThinking(content);
        };
        this.game.onAiError = (errorMessage) => {
            this.handleAiError(errorMessage);
        };
    }
    
    /**
     * ゲーム状態の表示を更新
     */
    updateGameStatus(state) {
        let statusText = '';
        if (state.gameResult) {
            statusText = state.gameResult === 'sente_win' ? '先手の勝ちです！' : '後手の勝ちです！';
        } else if (state.aiThinking) {
            statusText = 'AIが思考中...';
        } else {
            const playerText = state.currentPlayer === PLAYER.SENTE ? '先手' : '後手';
            statusText = `${playerText}の手番です`;
        }
        this.gameStatusElement.textContent = statusText;
    }
    
    /**
     * 棋譜の表示を更新
     */
    updateGameRecord(gameHistory) {
        this.gameRecordElement.innerHTML = '';
        gameHistory.forEach((move, index) => {
            const moveElement = document.createElement('div');
            moveElement.className = 'move-record';
            moveElement.dataset.index = index;
            const moveNumber = Math.floor(index / 2) + 1;
            const playerMark = move.player === PLAYER.SENTE ? '▲' : '△';
            let moveText = '';
            if (move.type === 'move') {
                const pieceName = PIECE_NAMES[move.pieceType];
                const toCol = 9 - move.to.col;
                const toRow = ['一', '二', '三', '四', '五', '六', '七', '八', '九'][move.to.row];
                moveText = `${playerMark}${toCol}${toRow}${pieceName}`;
                if (move.promote) moveText += '成';
                if (move.capture) moveText += '(取)';
            } else if (move.type === 'drop') {
                const pieceName = PIECE_NAMES[move.pieceType];
                const toCol = 9 - move.to.col;
                const toRow = ['一', '二', '三', '四', '五', '六', '七', '八', '九'][move.to.row];
                moveText = `${playerMark}${toCol}${toRow}${pieceName}打`;
            }
            moveElement.textContent = `${moveNumber}. ${moveText}`;
            moveElement.addEventListener('click', () => {
                this.game.replayMove(index);
                document.querySelectorAll('.move-record.current-move').forEach(el => el.classList.remove('current-move'));
                moveElement.classList.add('current-move');
            });
            this.gameRecordElement.appendChild(moveElement);
        });
    }
    
    updateCapturedPieces() {
        this.updateCapturedPiecesForPlayer(PLAYER.SENTE);
        this.updateCapturedPiecesForPlayer(PLAYER.GOTE);
    }

    updateCapturedPiecesForPlayer(player) {
        const element = player === PLAYER.SENTE ? this.capturedPiecesSenteElement : this.capturedPiecesGoteElement;
        element.innerHTML = '';
        const capturedPieces = this.game.board.capturedPieces[player];
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

                // 選択状態の視覚反映：現在選択されているかをゲーム状態から判定
                this.updateCapturedPieces();
            });
            // 現在選択中なら強調
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
        this.promotionDialog = document.createElement('div');
        this.promotionDialog.className = 'promotion-dialog';
        const boardRect = this.game.board.canvas.getBoundingClientRect();
        const cellSize = this.game.board.cellSize;
        const boardMargin = this.game.board.boardMargin;
        const x = boardRect.left + boardMargin + toPos.col * cellSize;
        const y = boardRect.top + boardMargin + toPos.row * cellSize;
        this.promotionDialog.style.left = `${x}px`;
        this.promotionDialog.style.top = `${y}px`;
        const piece = this.game.board.board[fromPos.row][fromPos.col];
        const pieceName = PIECE_NAMES[piece.type];
        const promotedPieceName = PIECE_NAMES[PROMOTION_MAP[piece.type]];
        const message = document.createElement('div');
        message.textContent = `${pieceName}を成りますか？`;
        this.promotionDialog.appendChild(message);
        const promoteButton = document.createElement('button');
        promoteButton.textContent = `成る（${promotedPieceName}）`;
        promoteButton.addEventListener('click', () => {
            this.game.handlePromotionDialogResult(true);
            document.body.removeChild(this.promotionDialog);
            this.promotionDialog = null;
        });
        this.promotionDialog.appendChild(promoteButton);
        const dontPromoteButton = document.createElement('button');
        dontPromoteButton.textContent = `成らない（${pieceName}）`;
        dontPromoteButton.addEventListener('click', () => {
            this.game.handlePromotionDialogResult(false);
            document.body.removeChild(this.promotionDialog);
            this.promotionDialog = null;
        });
        this.promotionDialog.appendChild(dontPromoteButton);
        document.body.appendChild(this.promotionDialog);
    }

    openSettingsModal() {
        this.loadApiSettings();
        this.settingsModal.style.display = 'block';
    }

    closeSettingsModal() {
        this.settingsModal.style.display = 'none';
    }

    loadApiSettings() {
        Object.values(LLM_MODELS).forEach(model => {
            const key = localStorage.getItem(model.keyName);
            if (key) {
                const input = document.getElementById(model.keyName);
                if (input) input.value = key;
                if (window.settings) {
                    window.settings.apiKeys[model.keyName] = key;
                }
            }
        });
        const g3 = document.getElementById('gemini3Thinking');
        if (g3 && window.settings) {
            g3.value = window.settings.getGemini3Thinking();
        }
        const gf = document.getElementById('geminiFlashThinking');
        if (gf && window.settings) {
            gf.value = window.settings.getGeminiFlashThinking();
        }
    }

    saveApiSettings() {
        Object.values(LLM_MODELS).forEach(model => {
            const input = document.getElementById(model.keyName);
            const key = input ? input.value : '';
            if (key) {
                localStorage.setItem(model.keyName, key);
                if (window.settings) window.settings.apiKeys[model.keyName] = key;
            } else {
                localStorage.removeItem(model.keyName);
                if (window.settings) window.settings.apiKeys[model.keyName] = null;
            }
        });
        const g3 = document.getElementById('gemini3Thinking');
        if (g3 && window.settings) {
            window.settings.setGemini3Thinking(g3.value);
        }
        const gf = document.getElementById('geminiFlashThinking');
        if (gf && window.settings) {
            window.settings.setGeminiFlashThinking(gf.value);
        }
        this.closeSettingsModal();
        alert('API設定を保存しました');
    }

    updateAiThinking(content) {
        if (!this.aiThinkingElement) return;
        this.clearAiErrorDisplay();
        const formattedContent = content.replace(/\n/g, '<br>');
        this.aiThinkingElement.innerHTML = formattedContent;
        this.aiThinkingElement.scrollTop = this.aiThinkingElement.scrollHeight;
    }

    hideAiThinking() {
        if (!this.aiThinkingElement) return;
        this.aiThinkingElement.innerHTML = '';
        this.clearAiErrorDisplay();
    }

    handleAiError(errorMessage) {
        if (!this.aiThinkingElement) return;
        this.clearAiErrorDisplay();
        const errorElement = document.createElement('div');
        errorElement.className = 'ai-error-message';
        errorElement.textContent = `エラーが発生しました: ${errorMessage}`;
        this.aiThinkingElement.appendChild(errorElement);
        this.aiErrorRetryButton = document.createElement('button');
        this.aiErrorRetryButton.id = 'retryAiMoveBtn';
        this.aiErrorRetryButton.textContent = 'AIの手番をやり直す';
        this.aiErrorRetryButton.addEventListener('click', () => {
            this.retryAiMove();
        });
        this.aiThinkingElement.appendChild(this.aiErrorRetryButton);
        this.aiThinkingElement.scrollTop = this.aiThinkingElement.scrollHeight;
    }

    retryAiMove() {
        this.clearAiErrorDisplay();
        this.game.makeBotMove();
    }

    clearAiErrorDisplay() {
        if (!this.aiThinkingElement) return;
        this.aiThinkingElement.querySelectorAll('.ai-error-message').forEach(el => el.remove());
        if (this.aiErrorRetryButton && this.aiErrorRetryButton.parentNode === this.aiThinkingElement) {
            this.aiThinkingElement.removeChild(this.aiErrorRetryButton);
        }
        this.aiErrorRetryButton = null;
    }
}
