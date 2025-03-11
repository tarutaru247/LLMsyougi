/**
 * 将棋ゲームのロジックを管理するクラス
 */
class Game {
    /**
     * ゲームのインスタンスを作成
     * @param {Board} board - 将棋盤のインスタンス
     */
    constructor(board) {
        this.board = board;
        this.currentPlayer = PLAYER.SENTE; // 先手から開始
        this.gameMode = 'human'; // 初期モードは人間対人間
        this.gameHistory = []; // 棋譜
        this.currentMoveIndex = -1; // 現在の手番のインデックス
        this.isPromotionDialogOpen = false; // 成り駒ダイアログの表示状態
        this.pendingMove = null; // 成り駒ダイアログ表示中の移動情報
        this.selectedCapturedPiece = null; // 選択された持ち駒
        
        // ボードのイベントハンドラを設定
        this.board.onCellClick = this.handleCellClick.bind(this);
        
        // AIの思考状態
        this.aiThinking = false;
        
        // ゲーム状態の更新イベント
        this.onGameStateUpdate = null;
        
        // 棋譜の更新イベント
        this.onGameRecordUpdate = null;
        
        // 持ち駒の更新イベント
        this.onCapturedPiecesUpdate = null;
    }
    
    /**
     * ゲームを初期化
     */
    initialize() {
        this.board.initializeBoard();
        this.currentPlayer = PLAYER.SENTE;
        this.gameHistory = [];
        this.currentMoveIndex = -1;
        this.updateGameState();
        this.board.draw();
        
        if (this.onGameRecordUpdate) {
            this.onGameRecordUpdate(this.gameHistory);
        }
        
        if (this.onCapturedPiecesUpdate) {
            this.onCapturedPiecesUpdate(this.board.capturedPieces);
        }
    }
    
    /**
     * ゲームモードを設定
     * @param {string} mode - ゲームモード ('human' または 'bot')
     */
    setGameMode(mode) {
        this.gameMode = mode;
        this.initialize();
    }
    
    /**
     * セルクリック時の処理
     * @param {Object} pos - クリックされたセルの位置 {row, col}
     */
    handleCellClick(pos) {
        // AIの思考中は操作を無視
        if (this.aiThinking) {
            return;
        }
        
        // 成り駒ダイアログ表示中の場合は無視
        if (this.isPromotionDialogOpen) {
            return;
        }
        
        // 棋譜再生中の場合は操作を無視
        if (this.currentMoveIndex < this.gameHistory.length - 1) {
            return;
        }
        
        const clickedPiece = this.board.board[pos.row][pos.col];
        
        // 駒が選択されていない場合
        if (!this.board.selectedPiece && !this.selectedCapturedPiece) {
            // クリックされたセルに駒があり、それが現在のプレイヤーの駒の場合
            if (clickedPiece.type !== PIECE_TYPES.EMPTY && clickedPiece.player === this.currentPlayer) {
                this.board.selectPiece(pos);
                
                // 移動可能なマスをハイライト
                const validMoves = this.getValidMoves(pos);
                this.board.highlightMoves(validMoves);
            }
            return;
        }
        
        // 持ち駒が選択されている場合
        if (this.selectedCapturedPiece) {
            // 持ち駒を打つ
            if (this.dropCapturedPiece(pos)) {
                this.selectedCapturedPiece = null;
                this.nextTurn();
            }
            return;
        }
        
        // 駒が選択されている場合
        
        // 同じ駒をクリックした場合は選択解除
        if (this.board.selectedPos.row === pos.row && this.board.selectedPos.col === pos.col) {
            this.board.deselectPiece();
            return;
        }
        
        // 自分の駒をクリックした場合は選択し直し
        if (clickedPiece.type !== PIECE_TYPES.EMPTY && clickedPiece.player === this.currentPlayer) {
            this.board.selectPiece(pos);
            
            // 移動可能なマスをハイライト
            const validMoves = this.getValidMoves(pos);
            this.board.highlightMoves(validMoves);
            return;
        }
        
        // 移動先が移動可能なマスかどうかをチェック
        const validMoves = this.getValidMoves(this.board.selectedPos);
        const isValidMove = validMoves.some(move => move.row === pos.row && move.col === pos.col);
        
        if (isValidMove) {
            // 成れるかどうかをチェック
            const canPromote = MoveValidator.canPromote(
                this.board.board, 
                this.board.selectedPos, 
                pos
            );
            
            // 成らなければならない場合
            const mustPromote = MoveValidator.mustPromote(
                this.board.selectedPiece.type,
                pos,
                this.currentPlayer
            );
            
            if (canPromote && !mustPromote) {
                // 成るかどうかを選択するダイアログを表示
                this.showPromotionDialog(this.board.selectedPos, pos);
            } else {
                // 駒を移動
                this.movePiece(this.board.selectedPos, pos, mustPromote);
                this.nextTurn();
            }
        } else {
            // 無効な移動の場合は選択解除
            this.board.deselectPiece();
        }
    }
    
    /**
     * 持ち駒クリック時の処理
     * @param {number} player - プレイヤー
     * @param {number} index - クリックされた持ち駒のインデックス
     */
    handleCapturedPieceClick(player, index) {
        // AIの思考中は操作を無視
        if (this.aiThinking) {
            return;
        }
        
        // 成り駒ダイアログ表示中の場合は無視
        if (this.isPromotionDialogOpen) {
            return;
        }
        
        // 棋譜再生中の場合は操作を無視
        if (this.currentMoveIndex < this.gameHistory.length - 1) {
            return;
        }
        
        // 自分の持ち駒でない場合は無視
        if (player !== this.currentPlayer) {
            return;
        }
        
        // 持ち駒が存在しない場合は無視
        if (index >= this.board.capturedPieces[player].length) {
            return;
        }
        
        // 選択状態をリセット
        this.board.deselectPiece();
        
        // 持ち駒を選択
        this.selectedCapturedPiece = {
            player,
            index,
            piece: this.board.capturedPieces[player][index]
        };
        
        // 打てるマスをハイライト
        const validDropPositions = this.getValidDropPositions(this.selectedCapturedPiece.piece.type);
        this.board.highlightMoves(validDropPositions);
    }
    
    /**
     * 持ち駒を盤面に打つ
     * @param {Object} pos - 打つ位置 {row, col}
     * @param {boolean} force - 強制的に打つかどうか（反則手でも実行）
     * @returns {boolean} 打てた場合はtrue
     */
    dropCapturedPiece(pos, force = false) {
        if (!this.selectedCapturedPiece) {
            return false;
        }
        
        const { player, piece } = this.selectedCapturedPiece;
        
        // 持ち駒を打つ
        const success = this.board.dropPiece(piece.type, player, pos, force);
        
        if (success) {
            // 棋譜に記録
            this.recordMove({
                type: 'drop',
                player,
                pieceType: piece.type,
                to: { ...pos }
            });
            
            // 持ち駒の更新を通知
            if (this.onCapturedPiecesUpdate) {
                this.onCapturedPiecesUpdate(this.board.capturedPieces);
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * 駒を移動
     * @param {Object} fromPos - 移動元の位置 {row, col}
     * @param {Object} toPos - 移動先の位置 {row, col}
     * @param {boolean} promote - 成るかどうか
     */
    movePiece(fromPos, toPos, promote) {
        const piece = this.board.board[fromPos.row][fromPos.col];
        const capturedPiece = this.board.movePiece(fromPos, toPos, promote);
        
        // 棋譜に記録
        this.recordMove({
            type: 'move',
            player: this.currentPlayer,
            from: { ...fromPos },
            to: { ...toPos },
            pieceType: piece.type,
            promote,
            capture: capturedPiece ? capturedPiece.type : null
        });
        
        // 持ち駒の更新を通知
        if (this.onCapturedPiecesUpdate) {
            this.onCapturedPiecesUpdate(this.board.capturedPieces);
        }
    }
    
    /**
     * 次の手番へ
     */
    nextTurn() {
        // プレイヤーを交代
        this.currentPlayer = this.currentPlayer === PLAYER.SENTE ? PLAYER.GOTE : PLAYER.SENTE;
        
        // ゲーム状態を更新
        this.updateGameState();
        
        // BOTモードで、現在の手番がGOTEの場合はBOTの手を指す
        if (this.gameMode === 'bot' && this.currentPlayer === PLAYER.GOTE) {
            setTimeout(() => this.makeBotMove(), 500);
        }
    }
    
    /**
     * BOTの手を指す
     */
    makeBotMove() {
        this.aiThinking = true;
        this.updateGameState();
        
        // 少し遅延を入れてBOTの思考をシミュレート
        setTimeout(() => {
            // 合法手をすべて取得
            const allMoves = this.getAllPossibleMoves(PLAYER.GOTE);
            
            // ランダムに1手選択
            if (allMoves.length > 0) {
                const randomIndex = Math.floor(Math.random() * allMoves.length);
                const move = allMoves[randomIndex];
                
                if (move.type === 'move') {
                    // 駒の移動
                    this.movePiece(move.from, move.to, move.promote);
                } else if (move.type === 'drop') {
                    // 持ち駒を打つ
                    const pieceIndex = this.board.capturedPieces[PLAYER.GOTE].findIndex(
                        p => p.type === move.pieceType
                    );
                    
                    if (pieceIndex !== -1) {
                        this.selectedCapturedPiece = {
                            player: PLAYER.GOTE,
                            index: pieceIndex,
                            piece: this.board.capturedPieces[PLAYER.GOTE][pieceIndex]
                        };
                        
                        this.dropCapturedPiece(move.to);
                        this.selectedCapturedPiece = null;
                    }
                }
            }
            
            this.aiThinking = false;
            this.nextTurn();
        }, 1000);
    }
    
    /**
     * 成り駒ダイアログを表示
     * @param {Object} fromPos - 移動元の位置 {row, col}
     * @param {Object} toPos - 移動先の位置 {row, col}
     */
    showPromotionDialog(fromPos, toPos) {
        this.isPromotionDialogOpen = true;
        this.pendingMove = { fromPos, toPos };
        
        // UIに通知
        if (this.onPromotionDialogOpen) {
            this.onPromotionDialogOpen(fromPos, toPos);
        }
    }
    
    /**
     * 成り駒ダイアログの結果を処理
     * @param {boolean} promote - 成るかどうか
     */
    handlePromotionDialogResult(promote) {
        if (!this.pendingMove) {
            return;
        }
        
        const { fromPos, toPos } = this.pendingMove;
        
        // 駒を移動
        this.movePiece(fromPos, toPos, promote);
        
        // ダイアログを閉じる
        this.isPromotionDialogOpen = false;
        this.pendingMove = null;
        
        // 次の手番へ
        this.nextTurn();
    }
    
    /**
     * 指定された位置から移動可能なマスを取得
     * @param {Object} pos - 位置 {row, col}
     * @returns {Array<Object>} 移動可能な位置の配列 [{row, col}, ...]
     */
    getValidMoves(pos) {
        const validMoves = [];
        const piece = this.board.board[pos.row][pos.col];
        
        // 駒がない場合や相手の駒の場合は空配列を返す
        if (piece.type === PIECE_TYPES.EMPTY || piece.player !== this.currentPlayer) {
            return validMoves;
        }
        
        // 盤面上のすべてのマスについて移動可能かどうかをチェック
        for (let row = 0; row < BOARD_SIZE.ROWS; row++) {
            for (let col = 0; col < BOARD_SIZE.COLS; col++) {
                const toPos = { row, col };
                
                if (MoveValidator.isValidMove(this.board.board, pos, toPos, this.currentPlayer)) {
                    validMoves.push(toPos);
                }
            }
        }
        
        return validMoves;
    }
    
    /**
     * 指定された駒を打てる位置を取得
     * @param {number} pieceType - 駒の種類
     * @returns {Array<Object>} 打てる位置の配列 [{row, col}, ...]
     */
    getValidDropPositions(pieceType) {
        const validPositions = [];
        
        // 盤面上のすべてのマスについて打てるかどうかをチェック
        for (let row = 0; row < BOARD_SIZE.ROWS; row++) {
            for (let col = 0; col < BOARD_SIZE.COLS; col++) {
                const pos = { row, col };
                
                if (MoveValidator.canDropPiece(this.board.board, pos, pieceType, this.currentPlayer)) {
                    validPositions.push(pos);
                }
            }
        }
        
        return validPositions;
    }
    
    /**
     * 指定されたプレイヤーの可能なすべての手を取得
     * @param {number} player - プレイヤー
     * @returns {Array<Object>} 可能な手の配列
     */
    getAllPossibleMoves(player) {
        const allMoves = [];
        
        // 盤面上の駒の移動
        for (let row = 0; row < BOARD_SIZE.ROWS; row++) {
            for (let col = 0; col < BOARD_SIZE.COLS; col++) {
                const fromPos = { row, col };
                const piece = this.board.board[row][col];
                
                if (piece.type !== PIECE_TYPES.EMPTY && piece.player === player) {
                    // 移動可能なマスを取得
                    for (let toRow = 0; toRow < BOARD_SIZE.ROWS; toRow++) {
                        for (let toCol = 0; toCol < BOARD_SIZE.COLS; toCol++) {
                            const toPos = { row: toRow, col: toCol };
                            
                            if (MoveValidator.isValidMove(this.board.board, fromPos, toPos, player)) {
                                // 成れるかどうかをチェック
                                const canPromote = MoveValidator.canPromote(
                                    this.board.board, 
                                    fromPos, 
                                    toPos
                                );
                                
                                // 成らなければならない場合
                                const mustPromote = MoveValidator.mustPromote(
                                    piece.type,
                                    toPos,
                                    player
                                );
                                
                                if (canPromote) {
                                    if (mustPromote) {
                                        // 必ず成る
                                        allMoves.push({
                                            type: 'move',
                                            from: fromPos,
                                            to: toPos,
                                            pieceType: piece.type,
                                            promote: true
                                        });
                                    } else {
                                        // 成る場合と成らない場合の両方を追加
                                        allMoves.push({
                                            type: 'move',
                                            from: fromPos,
                                            to: toPos,
                                            pieceType: piece.type,
                                            promote: true
                                        });
                                        
                                        allMoves.push({
                                            type: 'move',
                                            from: fromPos,
                                            to: toPos,
                                            pieceType: piece.type,
                                            promote: false
                                        });
                                    }
                                } else {
                                    // 成れない
                                    allMoves.push({
                                        type: 'move',
                                        from: fromPos,
                                        to: toPos,
                                        pieceType: piece.type,
                                        promote: false
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // 持ち駒を打つ
        for (const piece of this.board.capturedPieces[player]) {
            for (let row = 0; row < BOARD_SIZE.ROWS; row++) {
                for (let col = 0; col < BOARD_SIZE.COLS; col++) {
                    const pos = { row, col };
                    
                    if (MoveValidator.canDropPiece(this.board.board, pos, piece.type, player)) {
                        allMoves.push({
                            type: 'drop',
                            to: pos,
                            pieceType: piece.type
                        });
                    }
                }
            }
        }
        
        return allMoves;
    }
    
    /**
     * 棋譜に手を記録
     * @param {Object} move - 手の情報
     */
    recordMove(move) {
        // 現在の手番より後の棋譜を削除（待った後に新しい手を指した場合）
        if (this.currentMoveIndex < this.gameHistory.length - 1) {
            this.gameHistory = this.gameHistory.slice(0, this.currentMoveIndex + 1);
        }
        
        // 棋譜に追加
        this.gameHistory.push({
            ...move,
            board: this.board.getBoardState(),
            capturedPieces: this.board.getCapturedPieces()
        });
        
        this.currentMoveIndex = this.gameHistory.length - 1;
        
        // 棋譜の更新を通知
        if (this.onGameRecordUpdate) {
            this.onGameRecordUpdate(this.gameHistory);
        }
    }
    
    /**
     * 指定された手番の局面を再現
     * @param {number} index - 手番のインデックス
     */
    replayMove(index) {
        if (index < -1 || index >= this.gameHistory.length) {
            return;
        }
        
        this.currentMoveIndex = index;
        
        if (index === -1) {
            // 初期局面
            this.board.initializeBoard();
            this.currentPlayer = PLAYER.SENTE;
        } else {
            // 指定された手番の局面
            const move = this.gameHistory[index];
            this.board.setBoardState(move.board);
            this.board.setCapturedPieces(move.capturedPieces);
            
            // 次のプレイヤーを設定
            this.currentPlayer = move.player === PLAYER.SENTE ? PLAYER.GOTE : PLAYER.SENTE;
        }
        
        this.board.draw();
        this.updateGameState();
        
        // 持ち駒の更新を通知
        if (this.onCapturedPiecesUpdate) {
            this.onCapturedPiecesUpdate(this.board.capturedPieces);
        }
    }
    
    /**
     * 一手戻る（待った）
     */
    undoMove() {
        // 初期局面の場合は何もしない
        if (this.currentMoveIndex === -1) {
            return;
        }
        
        // AIの思考中は操作を無視
        if (this.aiThinking) {
            return;
        }
        
        // 成り駒ダイアログ表示中の場合は無視
        if (this.isPromotionDialogOpen) {
            return;
        }
        
        // 一手前の局面を再現
        this.replayMove(this.currentMoveIndex - 1);
    }
    
    /**
     * ゲーム状態を更新
     */
    updateGameState() {
        // ゲーム状態の更新を通知
        if (this.onGameStateUpdate) {
            const state = {
                currentPlayer: this.currentPlayer,
                aiThinking: this.aiThinking,
                gameMode: this.gameMode
            };
            
            this.onGameStateUpdate(state);
        }
    }
}
