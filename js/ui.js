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
        this.settingsButton = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeModalButton = document.querySelector('.close');
        this.saveApiSettingsButton = document.getElementById('saveApiSettings');
        
        // 成り駒ダイアログ
        this.promotionDialog = null;
        
        // AIの思考パネル
        this.aiThinkingPanel = null;
        
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
        
        // 設定ボタン
        this.settingsButton.addEventListener('click', () => {
            this.openSettingsModal();
        });
        
        // モーダルを閉じるボタン
        this.closeModalButton.addEventListener('click', () => {
            this.closeSettingsModal();
        });
        
        // モーダル外クリックで閉じる
        window.addEventListener('click', (event) => {
            if (event.target === this.settingsModal) {
                this.closeSettingsModal();
            }
        });
        
        // API設定保存ボタン
        this.saveApiSettingsButton.addEventListener('click', () => {
            this.saveApiSettings();
        });
    }
    
    /**
     * ゲームイベントハンドラを設定
     */
    setupGameEventHandlers() {
        // ゲーム状態の更新イベント
        this.game.onGameStateUpdate = (state) => {
            this.updateGameStatus(state);
        };
        
        // 棋譜の更新イベント
        this.game.onGameRecordUpdate = (gameHistory) => {
            this.updateGameRecord(gameHistory);
        };
        
        // 成り駒ダイアログの表示イベント
        this.game.onPromotionDialogOpen = (fromPos, toPos) => {
            this.showPromotionDialog(fromPos, toPos);
        };
        
        // 持ち駒の更新イベント
        this.game.onCapturedPiecesUpdate = (capturedPieces) => {
            this.updateCapturedPieces();
        };
    }
    
    /**
     * ゲーム状態の表示を更新
     * @param {Object} state - ゲーム状態
     */
    updateGameStatus(state) {
        let statusText = '';
        
        if (state.aiThinking) {
            statusText = 'BOTが思考中...';
        } else {
            const playerText = state.currentPlayer === PLAYER.SENTE ? '先手' : '後手';
            statusText = `${playerText}の手番です`;
        }
        
        this.gameStatusElement.textContent = statusText;
    }
    
    /**
     * 棋譜の表示を更新
     * @param {Array<Object>} gameHistory - 棋譜
     */
    updateGameRecord(gameHistory) {
        // 棋譜表示をクリア
        this.gameRecordElement.innerHTML = '';
        
        // 各手を表示
        gameHistory.forEach((move, index) => {
            const moveElement = document.createElement('div');
            moveElement.className = 'move-record';
            moveElement.dataset.index = index;
            
            // 手番
            const moveNumber = Math.floor(index / 2) + 1;
            const playerMark = move.player === PLAYER.SENTE ? '▲' : '△';
            
            // 移動の表示
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
            
            moveElement.textContent = `${moveNumber}. ${moveText}`;
            
            // クリックイベント
            moveElement.addEventListener('click', () => {
                this.game.replayMove(index);
                
                // 現在の手を強調表示
                const currentMoves = document.querySelectorAll('.move-record.current-move');
                currentMoves.forEach(el => el.classList.remove('current-move'));
                moveElement.classList.add('current-move');
            });
            
            this.gameRecordElement.appendChild(moveElement);
        });
    }
    
    /**
     * 持ち駒の表示を更新
     */
    updateCapturedPieces() {
        // 先手の持ち駒
        this.updateCapturedPiecesForPlayer(PLAYER.SENTE);
        
        // 後手の持ち駒
        this.updateCapturedPiecesForPlayer(PLAYER.GOTE);
    }
    
    /**
     * 指定されたプレイヤーの持ち駒の表示を更新
     * @param {number} player - プレイヤー
     */
    updateCapturedPiecesForPlayer(player) {
        const element = player === PLAYER.SENTE ? 
            this.capturedPiecesSenteElement : 
            this.capturedPiecesGoteElement;
        
        // 持ち駒表示をクリア
        element.innerHTML = '';
        
        // 持ち駒を表示
        const capturedPieces = this.game.board.capturedPieces[player];
        
        // 駒の種類ごとにグループ化
        const pieceGroups = {};
        capturedPieces.forEach(piece => {
            if (!pieceGroups[piece.type]) {
                pieceGroups[piece.type] = [];
            }
            pieceGroups[piece.type].push(piece);
        });
        
        // 駒の種類ごとに表示
        Object.entries(pieceGroups).forEach(([type, pieces]) => {
            const pieceType = parseInt(type);
            const pieceName = PIECE_NAMES[pieceType];
            
            const pieceElement = document.createElement('div');
            pieceElement.className = 'captured-piece';
            
            // 複数ある場合は数を表示
            if (pieces.length > 1) {
                pieceElement.textContent = `${pieceName}×${pieces.length}`;
            } else {
                pieceElement.textContent = pieceName;
            }
            
            // クリックイベント
            pieceElement.addEventListener('click', () => {
                this.game.handleCapturedPieceClick(player, capturedPieces.indexOf(pieces[0]));
            });
            
            element.appendChild(pieceElement);
        });
    }
    
    /**
     * 成り駒ダイアログを表示
     * @param {Object} fromPos - 移動元の位置 {row, col}
     * @param {Object} toPos - 移動先の位置 {row, col}
     */
    showPromotionDialog(fromPos, toPos) {
        // すでにダイアログがある場合は削除
        if (this.promotionDialog) {
            document.body.removeChild(this.promotionDialog);
        }
        
        // ダイアログを作成
        this.promotionDialog = document.createElement('div');
        this.promotionDialog.className = 'promotion-dialog';
        
        // ダイアログの位置を設定
        const boardRect = this.game.board.canvas.getBoundingClientRect();
        const cellSize = this.game.board.cellSize;
        const boardMargin = this.game.board.boardMargin;
        
        const x = boardRect.left + boardMargin + toPos.col * cellSize;
        const y = boardRect.top + boardMargin + toPos.row * cellSize;
        
        this.promotionDialog.style.left = `${x}px`;
        this.promotionDialog.style.top = `${y}px`;
        
        // ダイアログの内容
        const piece = this.game.board.board[fromPos.row][fromPos.col];
        const pieceName = PIECE_NAMES[piece.type];
        const promotedPieceName = PIECE_NAMES[PROMOTION_MAP[piece.type]];
        
        const message = document.createElement('div');
        message.textContent = `${pieceName}を成りますか？`;
        this.promotionDialog.appendChild(message);
        
        // ボタン
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
        
        // ダイアログを表示
        document.body.appendChild(this.promotionDialog);
    }
    
    /**
     * 設定モーダルを開く
     */
    openSettingsModal() {
        // 保存されているAPIキーを表示
        this.loadApiSettings();
        
        // モーダルを表示
        this.settingsModal.style.display = 'block';
    }
    
    /**
     * 設定モーダルを閉じる
     */
    closeSettingsModal() {
        this.settingsModal.style.display = 'none';
    }
    
    /**
     * API設定を読み込む
     */
    loadApiSettings() {
        // ローカルストレージから設定を読み込む
        Object.values(LLM_MODELS).forEach(model => {
            const key = localStorage.getItem(model.keyName);
            if (key) {
                document.getElementById(model.keyName).value = key;
            }
        });
    }
    
    /**
     * API設定を保存
     */
    saveApiSettings() {
        // ローカルストレージに設定を保存
        Object.values(LLM_MODELS).forEach(model => {
            const key = document.getElementById(model.keyName).value;
            if (key) {
                localStorage.setItem(model.keyName, key);
            } else {
                localStorage.removeItem(model.keyName);
            }
        });
        
        // モーダルを閉じる
        this.closeSettingsModal();
        
        // 保存完了メッセージ
        alert('API設定を保存しました');
    }
    
    /**
     * AIの思考パネルを作成
     */
    createAiThinkingPanel() {
        // すでにパネルがある場合は何もしない
        if (this.aiThinkingPanel) {
            return;
        }
        
        // パネルを作成
        this.aiThinkingPanel = document.createElement('div');
        this.aiThinkingPanel.className = 'ai-thinking';
        
        const title = document.createElement('h3');
        title.textContent = 'AIの思考プロセス';
        this.aiThinkingPanel.appendChild(title);
        
        const content = document.createElement('pre');
        content.id = 'aiThinkingContent';
        this.aiThinkingPanel.appendChild(content);
        
        // ゲーム情報の後に挿入
        const gameInfo = document.querySelector('.game-info');
        gameInfo.appendChild(this.aiThinkingPanel);
    }
    
    /**
     * AIの思考内容を表示
     * @param {string} content - 思考内容
     */
    updateAiThinking(content) {
        // パネルがなければ作成
        if (!this.aiThinkingPanel) {
            this.createAiThinkingPanel();
        }
        
        // 思考内容を表示
        const aiThinkingContent = document.getElementById('aiThinkingContent');
        aiThinkingContent.textContent = content;
        
        // パネルを表示
        this.aiThinkingPanel.style.display = 'block';
    }
    
    /**
     * AIの思考パネルを非表示
     */
    hideAiThinking() {
        if (this.aiThinkingPanel) {
            this.aiThinkingPanel.style.display = 'none';
        }
    }
}
