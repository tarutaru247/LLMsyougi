/**
 * 将棋の駒に関する機能を提供するファイル
 */

class Piece {
    /**
     * 駒のインスタンスを作成
     * @param {number} type - 駒の種類（PIECE_TYPES定数から）
     * @param {number} player - プレイヤー（PLAYER.SENTE または PLAYER.GOTE）
     */
    constructor(type, player) {
        this.type = type;
        this.player = player;
    }

    /**
     * 駒の表示名を取得
     * @returns {string} 駒の表示名
     */
    getName() {
        return PIECE_NAMES[this.type] || '';
    }

    /**
     * 駒が成れるかどうかを判定
     * @returns {boolean} 成れる場合はtrue
     */
    canPromote() {
        return !CANNOT_PROMOTE.includes(this.type);
    }

    /**
     * 駒を成る
     * @returns {boolean} 成ることができた場合はtrue
     */
    promote() {
        if (!this.canPromote()) {
            return false;
        }

        const promotedType = PROMOTION_MAP[this.type];
        if (promotedType) {
            this.type = promotedType;
            return true;
        }
        
        return false;
    }

    /**
     * 成り駒を元に戻す
     * @returns {boolean} 元に戻すことができた場合はtrue
     */
    unpromote() {
        const unpromoted = UNPROMOTED_PIECE[this.type];
        if (unpromoted) {
            this.type = unpromoted;
            return true;
        }
        
        return false;
    }

    /**
     * 駒のクローンを作成
     * @returns {Piece} 駒のクローン
     */
    clone() {
        return new Piece(this.type, this.player);
    }
}

/**
 * 駒の移動が合法かどうかを判定するクラス
 */
class MoveValidator {
    /**
     * 指定された移動が合法かどうかを判定
     * @param {Array<Array<Object>>} board - 盤面の状態
     * @param {Object} fromPos - 移動元の位置 {row, col}
     * @param {Object} toPos - 移動先の位置 {row, col}
     * @param {number} currentPlayer - 現在の手番のプレイヤー
     * @returns {boolean} 合法な移動の場合はtrue
     */
    static isValidMove(board, fromPos, toPos, currentPlayer) {
        // 盤外への移動は不可
        if (!this.isOnBoard(toPos)) {
            return false;
        }

        // 移動元に駒がない場合は不可
        const piece = board[fromPos.row][fromPos.col];
        if (piece.type === PIECE_TYPES.EMPTY || piece.player === null) {
            return false;
        }

        // 自分の駒でない場合は不可
        if (piece.player !== currentPlayer) {
            return false;
        }

        // 移動先に自分の駒がある場合は不可
        const targetPiece = board[toPos.row][toPos.col];
        if (targetPiece.type !== PIECE_TYPES.EMPTY && targetPiece.player === currentPlayer) {
            return false;
        }

        // 駒の種類に応じた移動可能判定
        return this.isValidMoveByPieceType(board, fromPos, toPos, piece);
    }

    /**
     * 駒の種類に応じた移動可能判定
     * @param {Array<Array<Object>>} board - 盤面の状態
     * @param {Object} fromPos - 移動元の位置 {row, col}
     * @param {Object} toPos - 移動先の位置 {row, col}
     * @param {Object} piece - 駒の情報
     * @returns {boolean} 合法な移動の場合はtrue
     */
    static isValidMoveByPieceType(board, fromPos, toPos, piece) {
        // 駒の移動方向を取得
        const directions = MOVE_DIRECTIONS[piece.type];
        if (!directions) {
            return false;
        }

        // 後手の場合は方向を反転
        const isGote = piece.player === PLAYER.GOTE;

        for (const dir of directions) {
            let row = fromPos.row;
            let col = fromPos.col;
            
            // 後手の場合は方向を反転
            const rowDir = isGote ? -dir.row : dir.row;
            const colDir = isGote ? -dir.col : dir.col;
            
            // スライド移動（飛車、角、香車など）
            if (dir.sliding) {
                let canMove = false;
                
                // スライド移動の場合は、障害物がない限り移動可能
                while (true) {
                    row += rowDir;
                    col += colDir;
                    
                    // 盤外に出たら終了
                    if (!this.isOnBoard({row, col})) {
                        break;
                    }
                    
                    // 移動先に到達した場合
                    if (row === toPos.row && col === toPos.col) {
                        canMove = true;
                        break;
                    }
                    
                    // 途中に駒があれば移動不可
                    if (board[row][col].type !== PIECE_TYPES.EMPTY) {
                        break;
                    }
                }
                
                if (canMove) {
                    return true;
                }
            } 
            // 1マス移動または桂馬の動き
            else {
                row += rowDir;
                col += colDir;
                
                if (row === toPos.row && col === toPos.col) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * 位置が盤面上にあるかどうかを判定
     * @param {Object} pos - 位置 {row, col}
     * @returns {boolean} 盤面上にある場合はtrue
     */
    static isOnBoard(pos) {
        return pos.row >= 0 && pos.row < BOARD_SIZE.ROWS && 
               pos.col >= 0 && pos.col < BOARD_SIZE.COLS;
    }

    /**
     * 駒が成れる領域にあるかどうかを判定
     * @param {Object} pos - 位置 {row, col}
     * @param {number} player - プレイヤー
     * @returns {boolean} 成れる領域にある場合はtrue
     */
    static isPromotionZone(pos, player) {
        if (player === PLAYER.SENTE) {
            // 先手の場合、相手陣（0, 1, 2行目）
            return pos.row < 3;
        } else {
            // 後手の場合、相手陣（6, 7, 8行目）
            return pos.row > 5;
        }
    }

    /**
     * 駒が成らなければならないかどうかを判定
     * @param {number} pieceType - 駒の種類
     * @param {Object} pos - 位置 {row, col}
     * @param {number} player - プレイヤー
     * @returns {boolean} 成らなければならない場合はtrue
     */
    static mustPromote(pieceType, pos, player) {
        // 歩と香車は1段目、桂馬は1・2段目に移動したら必ず成る
        if (player === PLAYER.SENTE) {
            if (pieceType === PIECE_TYPES.FU || pieceType === PIECE_TYPES.KYO) {
                return pos.row === 0;
            }
            if (pieceType === PIECE_TYPES.KEI) {
                return pos.row <= 1;
            }
        } else {
            if (pieceType === PIECE_TYPES.FU || pieceType === PIECE_TYPES.KYO) {
                return pos.row === 8;
            }
            if (pieceType === PIECE_TYPES.KEI) {
                return pos.row >= 7;
            }
        }
        
        return false;
    }

    /**
     * 駒を打つことができるかどうかを判定
     * @param {Array<Array<Object>>} board - 盤面の状態
     * @param {Object} pos - 打つ位置 {row, col}
     * @param {number} pieceType - 打つ駒の種類
     * @param {number} player - プレイヤー
     * @returns {boolean} 打つことができる場合はtrue
     */
    static canDropPiece(board, pos, pieceType, player) {
        // 盤外には打てない
        if (!this.isOnBoard(pos)) {
            return false;
        }
        
        // すでに駒がある場所には打てない
        if (board[pos.row][pos.col].type !== PIECE_TYPES.EMPTY) {
            return false;
        }
        
        // 歩と香車は1段目、桂馬は1・2段目に打てない
        if (player === PLAYER.SENTE) {
            if (pieceType === PIECE_TYPES.FU || pieceType === PIECE_TYPES.KYO) {
                if (pos.row === 0) return false;
            }
            if (pieceType === PIECE_TYPES.KEI) {
                if (pos.row <= 1) return false;
            }
        } else {
            if (pieceType === PIECE_TYPES.FU || pieceType === PIECE_TYPES.KYO) {
                if (pos.row === 8) return false;
            }
            if (pieceType === PIECE_TYPES.KEI) {
                if (pos.row >= 7) return false;
            }
        }
        
        // 二歩の禁止（同じ筋に自分の歩がすでにある場合は打てない）
        if (pieceType === PIECE_TYPES.FU) {
            for (let row = 0; row < BOARD_SIZE.ROWS; row++) {
                if (board[row][pos.col].type === PIECE_TYPES.FU && 
                    board[row][pos.col].player === player) {
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * 指定された位置の駒が成れるかどうかを判定
     * @param {Array<Array<Object>>} board - 盤面の状態
     * @param {Object} fromPos - 移動元の位置 {row, col}
     * @param {Object} toPos - 移動先の位置 {row, col}
     * @returns {boolean} 成れる場合はtrue
     */
    static canPromote(board, fromPos, toPos) {
        const piece = board[fromPos.row][fromPos.col];
        
        // 成れない駒の場合はfalse
        if (CANNOT_PROMOTE.includes(piece.type)) {
            return false;
        }
        
        // 移動元または移動先が敵陣であれば成れる
        return this.isPromotionZone(fromPos, piece.player) || 
               this.isPromotionZone(toPos, piece.player);
    }
}
