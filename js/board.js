/**
 * 将棋盤の描画と操作を管理するクラス
 */
class Board {
    /**
     * 将棋盤のインスタンスを作成
     * @param {string} canvasId - 将棋盤を描画するcanvas要素のID
     */
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // 盤面のサイズと余白
        this.cellSize = 45;
        this.boardMargin = 25;
        
        // 駒の選択状態
        this.selectedPiece = null;
        this.selectedPos = null;
        this.highlightedCells = [];
        
        // 盤面の状態
        this.initializeBoard();
        
        // マウスイベントのリスナー設定
        this.setupEventListeners();
    }
    
    /**
     * 盤面の状態を初期化
     */
    initializeBoard() {
        this.board = JSON.parse(JSON.stringify(INITIAL_BOARD));
        this.capturedPieces = {
            [PLAYER.SENTE]: [],
            [PLAYER.GOTE]: []
        };
    }
    
    /**
     * マウスイベントのリスナーを設定
     */
    setupEventListeners() {
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }
    
    /**
     * クリックイベントのハンドラ
     * @param {MouseEvent} event - マウスイベント
     */
    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // クリックされたセルの位置を計算
        const col = Math.floor((x - this.boardMargin) / this.cellSize);
        const row = Math.floor((y - this.boardMargin) / this.cellSize);
        
        // 盤外のクリックは無視
        if (row < 0 || row >= BOARD_SIZE.ROWS || col < 0 || col >= BOARD_SIZE.COLS) {
            return;
        }
        
        // ゲームロジックにクリックイベントを通知
        if (this.onCellClick) {
            this.onCellClick({ row, col });
        }
    }
    
    /**
     * マウス移動イベントのハンドラ
     * @param {MouseEvent} event - マウスイベント
     */
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // マウスが乗っているセルの位置を計算
        const col = Math.floor((x - this.boardMargin) / this.cellSize);
        const row = Math.floor((y - this.boardMargin) / this.cellSize);
        
        // 盤外のマウス移動は無視
        if (row < 0 || row >= BOARD_SIZE.ROWS || col < 0 || col >= BOARD_SIZE.COLS) {
            return;
        }
        
        // ゲームロジックにマウス移動イベントを通知
        if (this.onCellHover) {
            this.onCellHover({ row, col });
        }
    }
    
    /**
     * 将棋盤を描画
     */
    draw() {
        this.clearCanvas();
        this.drawBoard();
        this.drawCoordinates();
        this.drawPieces();
        this.drawHighlights();
    }
    
    /**
     * キャンバスをクリア
     */
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * 将棋盤を描画
     */
    drawBoard() {
        // 盤の背景
        this.ctx.fillStyle = '#f0cea0';
        this.ctx.fillRect(
            this.boardMargin, 
            this.boardMargin, 
            this.cellSize * BOARD_SIZE.COLS, 
            this.cellSize * BOARD_SIZE.ROWS
        );
        
        // 盤の枠線
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            this.boardMargin, 
            this.boardMargin, 
            this.cellSize * BOARD_SIZE.COLS, 
            this.cellSize * BOARD_SIZE.ROWS
        );
        
        // マス目の線
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= BOARD_SIZE.ROWS; i++) {
            const y = this.boardMargin + i * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(this.boardMargin, y);
            this.ctx.lineTo(this.boardMargin + this.cellSize * BOARD_SIZE.COLS, y);
            this.ctx.stroke();
        }
        
        for (let i = 0; i <= BOARD_SIZE.COLS; i++) {
            const x = this.boardMargin + i * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.boardMargin);
            this.ctx.lineTo(x, this.boardMargin + this.cellSize * BOARD_SIZE.ROWS);
            this.ctx.stroke();
        }
        
        // 星の位置に点を描画
        const starPositions = [
            { row: 2, col: 2 },
            { row: 2, col: 6 },
            { row: 6, col: 2 },
            { row: 6, col: 6 }
        ];
        
        this.ctx.fillStyle = '#000';
        for (const pos of starPositions) {
            const x = this.boardMargin + pos.col * this.cellSize;
            const y = this.boardMargin + pos.row * this.cellSize;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    /**
     * 座標を描画
     */
    drawCoordinates() {
        this.ctx.fillStyle = '#000';
        this.ctx.font = '14px serif';
        this.ctx.textAlign = 'center';
        
        // 列番号（1〜9）
        for (let col = 0; col < BOARD_SIZE.COLS; col++) {
            const x = this.boardMargin + col * this.cellSize + this.cellSize / 2;
            const y = this.boardMargin - 8;
            this.ctx.fillText(BOARD_SIZE.COLS - col, x, y);
        }
        
        // 行番号（一〜九）
        const rowLabels = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
        for (let row = 0; row < BOARD_SIZE.ROWS; row++) {
            const x = this.boardMargin + BOARD_SIZE.COLS * this.cellSize + 15;
            const y = this.boardMargin + row * this.cellSize + this.cellSize / 2 + 5;
            this.ctx.fillText(rowLabels[row], x, y);
        }
    }
    
    /**
     * 駒を描画
     * @param {Object} piece - 駒の情報
     * @param {number} row - 行番号
     * @param {number} col - 列番号
     */
    drawPiece(piece, row, col) {
        const x = this.boardMargin + col * this.cellSize + this.cellSize / 2;
        const y = this.boardMargin + row * this.cellSize + this.cellSize / 2;
        
        // 駒の背景
        this.ctx.fillStyle = '#f8c06c';
        this.ctx.beginPath();
        
        // 後手の駒は三角形も逆向きに
        if (piece.player === PLAYER.GOTE) {
            this.ctx.moveTo(x, y + this.cellSize * 0.35);
            this.ctx.lineTo(x + this.cellSize * 0.3, y - this.cellSize * 0.35);
            this.ctx.lineTo(x - this.cellSize * 0.3, y - this.cellSize * 0.35);
        } else {
            this.ctx.moveTo(x, y - this.cellSize * 0.35);
            this.ctx.lineTo(x + this.cellSize * 0.3, y + this.cellSize * 0.35);
            this.ctx.lineTo(x - this.cellSize * 0.3, y + this.cellSize * 0.35);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // 駒の文字
        this.ctx.fillStyle = '#000';
        this.ctx.font = '20px serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // 文字の位置を調整して重ならないようにする
        const textOffsetY = piece.player === PLAYER.GOTE ? -5 : 5;
        
        // 後手の駒は180度回転
        if (piece.player === PLAYER.GOTE) {
            this.ctx.save();
            this.ctx.translate(x, y + textOffsetY);
            this.ctx.rotate(Math.PI);
            this.ctx.fillText(PIECE_NAMES[piece.type], 0, 0);
            this.ctx.restore();
        } else {
            this.ctx.fillText(PIECE_NAMES[piece.type], x, y + textOffsetY);
        }
    }
    
    /**
     * 駒を描画
     */
    drawPieces() {
        for (let row = 0; row < BOARD_SIZE.ROWS; row++) {
            for (let col = 0; col < BOARD_SIZE.COLS; col++) {
                const piece = this.board[row][col];
                if (piece.type !== PIECE_TYPES.EMPTY) {
                    this.drawPiece(piece, row, col);
                }
            }
        }
    }
    
    /**
     * ハイライトを描画
     */
    drawHighlights() {
        // 選択された駒のハイライト
        if (this.selectedPos) {
            const { row, col } = this.selectedPos;
            const x = this.boardMargin + col * this.cellSize;
            const y = this.boardMargin + row * this.cellSize;
            
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        }
        
        // 移動可能なマスのハイライト
        for (const pos of this.highlightedCells) {
            const x = this.boardMargin + pos.col * this.cellSize;
            const y = this.boardMargin + pos.row * this.cellSize;
            
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        }
    }
    
    /**
     * 駒を選択
     * @param {Object} pos - 選択する駒の位置 {row, col}
     */
    selectPiece(pos) {
        this.selectedPos = pos;
        this.selectedPiece = this.board[pos.row][pos.col];
        this.draw();
    }
    
    /**
     * 駒の選択を解除
     */
    deselectPiece() {
        this.selectedPos = null;
        this.selectedPiece = null;
        this.highlightedCells = [];
        this.draw();
    }
    
    /**
     * 移動可能なマスをハイライト
     * @param {Array<Object>} positions - 移動可能な位置の配列 [{row, col}, ...]
     */
    highlightMoves(positions) {
        this.highlightedCells = positions;
        this.draw();
    }
    
    /**
     * 駒を移動
     * @param {Object} fromPos - 移動元の位置 {row, col}
     * @param {Object} toPos - 移動先の位置 {row, col}
     * @param {boolean} promote - 成るかどうか
     * @returns {Object|null} 取った駒（あれば）
     */
    movePiece(fromPos, toPos, promote = false) {
        // 移動元の駒を取得
        const piece = this.board[fromPos.row][fromPos.col];
        
        // 移動先の駒を取得（駒を取る場合に使用）
        const capturedPiece = this.board[toPos.row][toPos.col];
        
        // 駒を取った場合は持ち駒に追加
        if (capturedPiece.type !== PIECE_TYPES.EMPTY) {
            // 成り駒を元に戻す
            let capturedType = capturedPiece.type;
            const unpromoted = UNPROMOTED_PIECE[capturedType];
            if (unpromoted) {
                capturedType = unpromoted;
            }
            
            // 持ち駒に追加
            this.capturedPieces[piece.player].push({
                type: capturedType,
                player: piece.player
            });
        }
        
        // 駒を移動
        this.board[toPos.row][toPos.col] = piece;
        this.board[fromPos.row][fromPos.col] = { type: PIECE_TYPES.EMPTY, player: null };
        
        // 成る場合は駒を成る
        if (promote) {
            // piece.promote() の代わりに直接typeを変更
            const promotedType = PROMOTION_MAP[piece.type];
            if (promotedType) {
                this.board[toPos.row][toPos.col].type = promotedType;
            }
        }
        
        // 選択状態をリセット
        this.deselectPiece();
        
        return capturedPiece;
    }
    
    /**
     * 持ち駒を盤面に打つ
     * @param {number} pieceType - 打つ駒の種類
     * @param {number} player - プレイヤー
     * @param {Object} pos - 打つ位置 {row, col}
     * @param {boolean} force - 強制的に打つかどうか（反則手でも実行）
     * @returns {boolean} 打てた場合はtrue
     */
    dropPiece(pieceType, player, pos, force = false) {
        // 打てるかどうかをチェック（forceがtrueの場合はスキップ）
        if (!force && !MoveValidator.canDropPiece(this.board, pos, pieceType, player)) {
            return false;
        }
        
        // 盤外への打ちは不可（forceでも不可）
        if (pos.row < 0 || pos.row >= BOARD_SIZE.ROWS || pos.col < 0 || pos.col >= BOARD_SIZE.COLS) {
            return false;
        }
        
        // 持ち駒から該当する駒を探す
        if (!this.capturedPieces[player] || !Array.isArray(this.capturedPieces[player])) {
            console.error(`持ち駒が正しく初期化されていません。player: ${player}`);
            return false;
        }
        
        const pieceIndex = this.capturedPieces[player].findIndex(p => p.type === pieceType);
        if (pieceIndex === -1) {
            return false;
        }
        
        // 移動先に既に駒がある場合は、その駒を取る（forceの場合のみ）
        if (force && this.board[pos.row][pos.col].type !== PIECE_TYPES.EMPTY) {
            const capturedPiece = this.board[pos.row][pos.col];
            // 成り駒を元に戻す
            let capturedType = capturedPiece.type;
            const unpromoted = UNPROMOTED_PIECE[capturedType];
            if (unpromoted) {
                capturedType = unpromoted;
            }
            
            // 持ち駒に追加
            this.capturedPieces[player].push({
                type: capturedType,
                player: player
            });
        }
        
        // 持ち駒から駒を取り出す
        const piece = this.capturedPieces[player].splice(pieceIndex, 1)[0];
        
        // 盤面に駒を配置
        this.board[pos.row][pos.col] = piece;
        
        // 選択状態をリセット
        this.deselectPiece();
        
        return true;
    }
    
    /**
     * 盤面の状態を取得
     * @returns {Array<Array<Object>>} 盤面の状態
     */
    getBoardState() {
        return JSON.parse(JSON.stringify(this.board));
    }
    
    /**
     * 持ち駒の状態を取得
     * @returns {Object} 持ち駒の状態
     */
    getCapturedPieces() {
        return JSON.parse(JSON.stringify(this.capturedPieces));
    }
    
    /**
     * 盤面の状態を設定
     * @param {Array<Array<Object>>} board - 盤面の状態
     */
    setBoardState(board) {
        this.board = JSON.parse(JSON.stringify(board));
        this.draw();
    }
    
    /**
     * 持ち駒の状態を設定
     * @param {Object} capturedPieces - 持ち駒の状態
     */
    setCapturedPieces(capturedPieces) {
        this.capturedPieces = JSON.parse(JSON.stringify(capturedPieces));
    }
    
    /**
     * 盤面の座標からキャンバス上の座標に変換
     * @param {Object} pos - 盤面の座標 {row, col}
     * @returns {Object} キャンバス上の座標 {x, y}
     */
    boardToCanvasCoords(pos) {
        return {
            x: this.boardMargin + pos.col * this.cellSize + this.cellSize / 2,
            y: this.boardMargin + pos.row * this.cellSize + this.cellSize / 2
        };
    }
    
    /**
     * キャンバス上の座標から盤面の座標に変換
     * @param {number} x - キャンバス上のX座標
     * @param {number} y - キャンバス上のY座標
     * @returns {Object|null} 盤面の座標 {row, col}、盤外の場合はnull
     */
    canvasToBoardCoords(x, y) {
        const col = Math.floor((x - this.boardMargin) / this.cellSize);
        const row = Math.floor((y - this.boardMargin) / this.cellSize);
        
        if (row < 0 || row >= BOARD_SIZE.ROWS || col < 0 || col >= BOARD_SIZE.COLS) {
            return null;
        }
        
        return { row, col };
    }
}
