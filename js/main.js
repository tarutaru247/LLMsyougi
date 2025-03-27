/**
 * メインアプリケーションの初期化と実行
 */
document.addEventListener('DOMContentLoaded', () => {
    // スタイルの追加
    addSettingsModalStyles();
    
    // 将棋盤の初期化
    const board = new Board('shogiBoard');
    
    // ゲームの初期化
    const game = new Game(board);
    
    // UIの初期化
    const ui = new UI(game);
    
    // BOTの初期化
    const bot = new Bot(game);
    
    // 設定の初期化
    const settings = new Settings();
    // グローバルに公開
    window.settings = settings;
    
    // LLMモデル選択UIの作成
    const gameControls = document.querySelector('.game-controls');
    createModelSelector(gameControls, settings, (modelKey) => {
        console.log(`モデルを変更: ${LLM_MODELS[modelKey].name}`);
    });
    
    // ゲームモードの拡張
    const gameModeSelect = document.getElementById('gameMode');
    
    // ゲームモード変更イベント
    gameModeSelect.addEventListener('change', () => {
        const mode = gameModeSelect.value;
        
        if (mode === 'llm') {
            // LLMモードの場合、選択されたモデルを使用
            game.setGameMode('llm');
            
            // LLMの思考処理を設定
            game.onAiTurn = (player) => {
                const modelKey = settings.getSelectedModel();
                
                // APIキーが設定されているかチェック
                if (!settings.hasSelectedModelApiKey()) {
                    alert(`${LLM_MODELS[modelKey].name}のAPIキーが設定されていません。設定画面で設定してください。`);
                    return;
                }
                
                // 思考中の状態を設定
                game.aiThinking = true;
                game.updateGameState();
                
                // LLMに手を選択させる
                bot.selectMoveWithLLM(player, modelKey, (move, thinking) => {
                    // 思考内容を表示
                    ui.updateAiThinking(thinking);
                    
                    if (move) {
                        // 反則手の場合は警告を表示
                        if (move.invalid) {
                            // 反則手であることを画面に表示
                            const alertDiv = document.createElement('div');
                            alertDiv.className = 'invalid-move-alert';
                            alertDiv.textContent = '※AIが反則手を指しました';
                            alertDiv.style.color = 'red';
                            alertDiv.style.fontWeight = 'bold';
                            alertDiv.style.padding = '10px';
                            alertDiv.style.marginBottom = '10px';
                            alertDiv.style.backgroundColor = 'rgba(255, 200, 200, 0.5)';
                            alertDiv.style.borderRadius = '5px';
                            
                            // 既存の警告があれば削除
                            const existingAlert = document.querySelector('.invalid-move-alert');
                            if (existingAlert) {
                                existingAlert.remove();
                            }
                            
                            // 警告を表示
                            const gameContainer = document.querySelector('.game-container');
                            gameContainer.insertBefore(alertDiv, gameContainer.firstChild);
                            
                            // 5秒後に警告を消す
                            setTimeout(() => {
                                alertDiv.style.opacity = '0';
                                alertDiv.style.transition = 'opacity 1s';
                                setTimeout(() => alertDiv.remove(), 1000);
                            }, 5000);
                        }
                        
                        if (move.type === 'move') {
                            // 駒の移動
                            game.movePiece(move.from, move.to, move.promote);
                        } else if (move.type === 'drop') {
                            // 持ち駒を打つ
                            // 持ち駒のインデックスを探す
                            const capturedPieces = game.board.capturedPieces[move.player];
                            
                            // 持ち駒が初期化されているか確認
                            if (!capturedPieces || !Array.isArray(capturedPieces)) {
                                console.error(`持ち駒が正しく初期化されていません。player: ${move.player}`);
                                // 持ち駒が初期化されていない場合は、初期化する
                                if (!game.board.capturedPieces[move.player]) {
                                    game.board.capturedPieces[move.player] = [];
                                }
                                // 持ち駒がないので処理をスキップ
                                return;
                            }
                            
                            const index = capturedPieces.findIndex(p => p.type === move.pieceType);
                            
                            if (index !== -1) {
                                game.selectedCapturedPiece = {
                                    player: move.player,
                                    piece: { type: move.pieceType, player: move.player },
                                    index: index
                                };
                                game.dropCapturedPiece(move.to, move.invalid);
                                game.selectedCapturedPiece = null;
                            }
                        }
                    }
                    
                    // 思考終了
                    game.aiThinking = false;
                    game.nextTurn();
                });
            };
        } else {
            // 通常モードの場合
            game.setGameMode(mode);
            game.onAiTurn = null;
            
            // AIの思考パネルを非表示
            ui.hideAiThinking();
        }
    });
    
    // ゲームの初期化
    game.initialize();
    
    // 持ち駒クリックイベントの設定
    document.getElementById('capturedPiecesSente').addEventListener('click', (event) => {
        if (event.target.classList.contains('captured-piece')) {
            const index = Array.from(event.target.parentNode.children).indexOf(event.target);
            game.handleCapturedPieceClick(PLAYER.SENTE, index);
        }
    });
    
    document.getElementById('capturedPiecesGote').addEventListener('click', (event) => {
        if (event.target.classList.contains('captured-piece')) {
            const index = Array.from(event.target.parentNode.children).indexOf(event.target);
            game.handleCapturedPieceClick(PLAYER.GOTE, index);
        }
    });
    
    // LLMモードの拡張
    game.onAiTurn = null;
    
    // ターン終了時の処理を拡張
    const originalNextTurn = game.nextTurn;
    game.nextTurn = function() {
        originalNextTurn.call(this);
        
        // LLMモードで、現在の手番がGOTEの場合はLLMの手を指す
        if (this.gameMode === 'llm' && this.currentPlayer === PLAYER.GOTE && this.onAiTurn) {
            setTimeout(() => this.onAiTurn(PLAYER.GOTE), 500);
        }
    };
    
    // 盤面の描画
    board.draw();
    
    console.log('将棋アプリケーションが初期化されました');
});
