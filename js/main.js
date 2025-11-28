/**
 * メインエントリ
 */
document.addEventListener('DOMContentLoaded', () => {
    // スタイル
    addSettingsModalStyles();

    // 設定・盤・ゲーム・UI・BOT初期化
    const settings = new Settings();
    window.settings = settings;

    const board = new Board('shogiBoard');
    const game = new Game(board, settings);
    const ui = new UI(game);
    game.ui = ui;
    const bot = new Bot(game);

    // モデルセレクタ（設定バーに表示）
    const settingsBar = document.getElementById('modelSettingsBar');
    if (settingsBar) {
        createModelSelector(settingsBar, settings, () => {
            if (game.ui?.aiThinkingHistory) {
                game.ui.aiThinkingHistory = [];
                game.ui.renderThinkingHistory?.();
            }
        });
    }

    // API設定モーダル
    const openApiSettingsBtn = document.getElementById('openApiSettingsBtn');
    if (openApiSettingsBtn) {
        openApiSettingsBtn.addEventListener('click', () => {
            const modal = document.getElementById('settingsModal');
            if (modal) modal.style.display = 'block';
        });
    }

    // ゲームモード切替
    const gameModeSelect = document.getElementById('gameMode');
    gameModeSelect.addEventListener('change', () => {
        const mode = gameModeSelect.value;
        game.setGameMode(mode);
        // 単体AIモードでは後手のみAI
        game.onAiTurn = mode === 'llm'
            ? (player) => {
                  const modelKey = settings.getSelectedModel();
                  if (!settings.hasSelectedModelApiKey()) {
                      alert(`${LLM_MODELS[modelKey].name} のAPIキーが未設定です。設定してください。`);
                      return;
                  }
                  game.aiThinking = true;
                  game.updateGameState();
                  bot.selectMoveWithLLM(player, modelKey, (move, thinking) => {
                      ui.updateAiThinking(thinking);
                      game.aiThinking = false;
                      if (move) {
                          if (move.type === 'move') {
                              game.movePiece(move.from, move.to, move.promote);
                          } else if (move.type === 'drop') {
                              const cp = game.board.capturedPieces[player] || [];
                              const idx = cp.findIndex(p => p.type === move.pieceType);
                              if (idx !== -1) {
                                  game.selectedCapturedPiece = { player, index: idx, piece: cp[idx] };
                                  game.dropCapturedPiece(move.to, !!move.invalid);
                                  game.selectedCapturedPiece = null;
                              }
                          }
                      }
                      game.nextTurn();
                  });
              }
            : null;
    });

    // 盤面初期化
    game.initialize();

    // 持ち駒クリック（人間用）
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

    // 後手AIの自動実行（単体AI）
    const originalNextTurn = game.nextTurn;
    game.nextTurn = function () {
        originalNextTurn.call(this);
        if (this.gameMode === 'llm' && this.currentPlayer === PLAYER.GOTE && this.onAiTurn) {
            setTimeout(() => this.onAiTurn(PLAYER.GOTE), 500);
        }
    };

    board.draw();
    console.log('アプリ初期化完了');
});
