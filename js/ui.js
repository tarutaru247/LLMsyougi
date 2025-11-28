/**
 * UIレイヤーを管理するクラス
 */
class UI {
    /**
     * @param {Game} game - ゲームインスタンス
     */
    constructor(game) {
        this.game = game;
        this.aiThinkingHistory = { sente: [], gote: [] };
        this.aiThinkingIndicator = { sente: null, gote: null };

        // DOM参照
        this.gameStatusElement = document.getElementById('gameStatus');
        this.gameRecordElement = document.getElementById('gameRecord');
        this.exportKifButton = document.getElementById('exportKifBtn');
        this.importKifButton = document.getElementById('importKifBtn');
        this.importKifInput = document.getElementById('importKifInput');
        this.capturedPiecesSenteElement = document.getElementById('capturedPiecesSente');
        this.capturedPiecesGoteElement = document.getElementById('capturedPiecesGote');
        this.newGameButton = document.getElementById('newGameBtn');
        this.undoButton = document.getElementById('undoBtn');
        this.startAiMatchButton = document.getElementById('startAiMatchBtn');
        this.stopAiMatchButton = document.getElementById('stopAiMatchBtn');
        this.gameModeSelect = document.getElementById('gameMode');
        this.settingsButton = document.getElementById('openApiSettingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeModalButton = document.querySelector('.close');
        this.howToButton = document.getElementById('howToBtn');
        this.howToModal = document.getElementById('howToModal');
        this.howToClose = document.getElementById('howToClose');
        this.saveApiSettingsLocalButton = document.getElementById('saveApiSettingsLocal');
        this.saveApiSettingsSessionButton = document.getElementById('saveApiSettingsSession');
        this.aiThinkingSenteElement = document.getElementById('aiThinkingSente');
        this.aiThinkingGoteElement = document.getElementById('aiThinkingGote');
        this.aiThinkingTitleSente = document.getElementById('aiThinkingTitleSente');
        this.aiThinkingTitleGote = document.getElementById('aiThinkingTitleGote');
        this.aiThinkingBlockSente = document.getElementById('aiThinkingBlockSente');
        this.aiThinkingBlockGote = document.getElementById('aiThinkingBlockGote');
        this.darkModeButton = document.getElementById('darkModeBtn');
        this.aiErrorRetryButton = null;
        this.aiTitle = document.querySelector('.ai-thinking-title');

        this.promotionDialog = null;

        // 既存の思考中インジケータがあれば除去し、初期状態で非表示にする
        const existingIndicator = document.querySelectorAll('.ai-thinking-indicator');
        existingIndicator.forEach(ind => ind.parentNode && ind.parentNode.removeChild(ind));
        this.aiThinkingIndicator = { sente: null, gote: null };

        this.setupEventListeners();
        this.setupGameEventHandlers();
        this.updateCapturedPieces();
        // 初期表示をモードに応じて調整
        this.updateThinkingVisibility(this.gameModeSelect.value);
        
        // ダークモード初期適用
        this.applyDarkMode();
    }

    /** イベントリスナー設定 */
    setupEventListeners() {
        this.newGameButton.addEventListener('click', () => this.game.initialize());
        this.undoButton.addEventListener('click', () => this.game.undoMove());
        if (this.startAiMatchButton) {
            this.startAiMatchButton.addEventListener('click', () => this.game.startAiMatch());
        }
        if (this.stopAiMatchButton) {
            this.stopAiMatchButton.addEventListener('click', () => this.game.stopAiMatch());
        }
        this.gameModeSelect.addEventListener('change', () => {
            this.game.setGameMode(this.gameModeSelect.value);
            this.updateThinkingVisibility(this.gameModeSelect.value);
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

        if (this.exportKifButton) {
            this.exportKifButton.addEventListener('click', () => this.exportKif());
        }
        if (this.importKifButton && this.importKifInput) {
            this.importKifButton.addEventListener('click', () => this.importKifInput.click());
            this.importKifInput.addEventListener('change', (e) => this.handleKifFile(e));
        }
        if (this.howToButton && this.howToModal) {
            this.howToButton.addEventListener('click', () => this.openHowToModal());
        }
        if (this.howToClose && this.howToModal) {
            this.howToClose.addEventListener('click', () => this.closeHowToModal());
        }
        
        if (this.darkModeButton) {
            this.darkModeButton.addEventListener('click', () => {
                const current = window.settings ? window.settings.getDarkMode() : false;
                const next = !current;
                if (window.settings) {
                    window.settings.setDarkMode(next);
                    this.applyDarkMode();
                }
            });
        }
    }

    /** ダークモード適用 */
    applyDarkMode() {
        const isDark = window.settings ? window.settings.getDarkMode() : false;
        if (isDark) {
            document.body.classList.add('dark-mode');
            if (this.darkModeButton) {
                this.darkModeButton.textContent = 'ライトモード';
                this.darkModeButton.title = 'ライトモードに切り替える';
            }
        } else {
            document.body.classList.remove('dark-mode');
            if (this.darkModeButton) {
                this.darkModeButton.textContent = 'ダークモード';
                this.darkModeButton.title = 'ダークモードに切り替える';
            }
        }
    }

    /** Game 側のイベントハンドラ設定 */
    setupGameEventHandlers() {
        this.game.onGameStateUpdate = (state) => this.updateGameStatus(state);
        this.game.onGameRecordUpdate = (history) => this.updateGameRecord(history);
        this.game.onPromotionDialogOpen = (fromPos, toPos) => this.showPromotionDialog(fromPos, toPos);
        this.game.onCapturedPiecesUpdate = () => this.updateCapturedPieces();
        this.game.onAiThinkingUpdate = (content, player, modelName) => this.updateAiThinking(content, player, modelName);
        this.game.onAiError = (errorMessage, player, modelName) => this.handleAiError(errorMessage, player, modelName);
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
            const toRowMap = ['\u4e00','\u4e8c','\u4e09','\u56db','\u4e94','\u516d','\u4e03','\u516b','\u4e5d'];
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

    /** 棋譜をKIF形式でエクスポート */
    exportKif() {
        const history = this.game.gameHistory || [];
        if (history.length === 0) {
            alert('棋譜がありません。');
            return;
        }

        const toRowMap = ['一','二','三','四','五','六','七','八','九'];
        const toFullWidth = (n) => String(n).replace(/[0-9]/g, d => '０１２３４５６７８９'[Number(d)]);

        const senteModelKey = window.settings ? window.settings.getSelectedModelForPlayer(PLAYER.SENTE) : null;
        const goteModelKey = window.settings ? window.settings.getSelectedModelForPlayer(PLAYER.GOTE) : null;
        const senteName = (senteModelKey && LLM_MODELS[senteModelKey]?.name) || '先手';
        const goteName = (goteModelKey && LLM_MODELS[goteModelKey]?.name) || '後手';

        const lines = [];
        lines.push('手合割：平手');
        lines.push(`先手：${senteName}`);
        lines.push(`後手：${goteName}`);
        lines.push('手数----指手---------消費時間--');

        const formatMove = (mv) => {
            const toCol = 9 - mv.to.col;
            const toRow = toRowMap[mv.to.row];
            const pieceName = PIECE_NAMES[mv.pieceType] || '';

            if (mv.type === 'drop') {
                return `${toFullWidth(toCol)}${toRow}${pieceName}打      `;
            }

            const fromCol = 9 - mv.from.col;
            const fromRow = toRowMap[mv.from.row];
            let text = `${toFullWidth(toCol)}${toRow}${pieceName}`;
            if (mv.promote) text += '成';
            text += `(${toFullWidth(fromCol)}${fromRow})`;
            return text.padEnd(13, ' ');
        };

        history.forEach((mv, idx) => {
            const no = String(idx + 1).padStart(4, ' ');
            const moveText = formatMove(mv);
            lines.push(`${no} ${moveText} ( 0:00/00:00:00)`);
        });

        const kifText = lines.join('\r\n');
        const blob = new Blob([kifText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const stamp = now.toISOString().replace(/[:T]/g, '-').slice(0, 16);
        a.download = `kifu-${stamp}.kif`;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
    }

    /** KIFファイル読み込み */
    handleKifFile(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const text = reader.result;
            const moves = this.parseKif(text);
            if (!moves) {
                alert('KIFの読み込みに失敗しました。');
                return;
            }
            const ok = this.game.importKifMoves(moves);
            if (!ok) {
                alert('局面の再現に失敗しました。棋譜内容を確認してください。');
                return;
            }
            alert('KIFを読み込みました。');
        };
        reader.readAsText(file, 'utf-8');
        // 入力をリセットして同じファイルでも再選択できるように
        event.target.value = '';
    }

    /** KIFテキストをパースして内部ムーブ配列に変換 */
    parseKif(text) {
        if (!text) return null;
        const lines = text.split(/\r?\n/);
        const moves = [];
        let lastDest = null;

        const rowMap = { '一':0,'二':1,'三':2,'四':3,'五':4,'六':5,'七':6,'八':7,'九':8 };
        const fwToHalf = (s) => s.replace(/[０-９]/g, d => String('０１２３４５６７８９'.indexOf(d)));

        // PIECE_NAMES 逆引き
        const nameToType = {};
        Object.entries(PIECE_NAMES).forEach(([k,v]) => { nameToType[v] = Number(k); });
        nameToType['玉'] = PIECE_TYPES.GYOKU;
        nameToType['王'] = PIECE_TYPES.GYOKU;
        nameToType['と'] = PIECE_TYPES.TO;
        nameToType['龍'] = PIECE_TYPES.RYU;
        nameToType['竜'] = PIECE_TYPES.RYU;
        nameToType['馬'] = PIECE_TYPES.UMA;

        const parseSquare = (sq) => {
            if (!sq || sq.length < 2) return null;
            const col = parseInt(fwToHalf(sq[0]), 10);
            const rowKanji = sq[1];
            const row = rowMap[rowKanji];
            if (isNaN(col) || row === undefined) return null;
            return { row, col: 9 - col };
        };

        const moveLineRe = /^\s*\d+\s+([^\s]+)\s*\(/;

        for (const line of lines) {
            const m = moveLineRe.exec(line);
            if (!m) continue;
            let token = m[1]; // 例: ２六歩(27) or ２六歩成(27) or ２六歩打 / 同　馬(52)
            token = token.replace(/^[▲△]/, ''); // 先後記号を除去
            token = token.replace(/\u3000/g, ''); // 全角空白除去

            // 行き先
            let dest = parseSquare(token.slice(0,2));
            if (!dest && token.startsWith('同')) {
                dest = lastDest ? { ...lastDest } : null;
            }
            if (!dest) return null;

            let rest = token.slice(2);
            // 元位置カッコを除去してから判定
            rest = rest.replace(/\(.*?\)/g, '');
            const isDrop = rest.includes('打');
            const isPromote = rest.includes('成');
            const pieceChar = rest.replace(/(打|成)/g,'');
            const pieceType = nameToType[pieceChar];
            if (!pieceType) return null;

            let fromPos = null;
            // 元位置 (..) から取得
            const fromMatch = line.match(/\((\d)(\d)\)/);
            if (!isDrop && fromMatch) {
                const fromCol = parseInt(fromMatch[1],10);
                const fromRow = parseInt(fromMatch[2],10);
                fromPos = { row: fromRow-1, col: 9 - fromCol };
            }

            if (isDrop && !pieceType) return null;
            moves.push({
                type: isDrop ? 'drop' : 'move',
                from: fromPos,
                to: dest,
                promote: isPromote,
                pieceType,
                player: moves.length % 2 === 0 ? PLAYER.SENTE : PLAYER.GOTE
            });
            lastDest = dest;
        }

        return moves.length > 0 ? moves : null;
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
        
        // botThinkingMode は設定UI側で変更時に即時保存されるため、ここでの保存処理は不要

        window.settings.saveSettings(mode);
        this.closeSettingsModal();
        const msg = mode === 'session'
            ? 'APIキーを一時的に保存しました（このタブを閉じると消えます）'
            : 'APIキーをブラウザに保存しました（localStorage）';
        alert(msg);
    }

    /**
     * AI思考内容を表示（先手/後手で分離）
     */
    updateAiThinking(content, player, modelName) {
        const isSente = player === PLAYER.SENTE;
        const key = isSente ? 'sente' : 'gote';
        const targetEl = isSente ? this.aiThinkingSenteElement : this.aiThinkingGoteElement;
        const titleEl = isSente ? this.aiThinkingTitleSente : this.aiThinkingTitleGote;
        if (titleEl && modelName) {
            titleEl.textContent = `${isSente ? '先手' : '後手'}（${modelName}）の思考`;
        }
        if (!targetEl) return;

        if (!this.aiThinkingHistory[key]) {
            this.aiThinkingHistory[key] = [];
        }
        const parsed = this.tryParseMoveJson(content);
        if (parsed) {
            const hist = this.aiThinkingHistory[key];
            const last = hist[hist.length - 1];
            const isDuplicate =
                last &&
                String(last.move_id ?? '') === String(parsed.move_id ?? '') &&
                String(last.notation ?? '') === String(parsed.notation ?? '') &&
                String(last.reason ?? '') === String(parsed.reason ?? '');
            if (!isDuplicate) {
                hist.push(parsed);
                if (hist.length > 30) hist.shift();
            }
            this.hideThinkingIndicator(isSente);
            this.renderThinkingHistory();
        } else {
            if (!content) {
                this.hideThinkingIndicator(isSente);
                const hist = this.aiThinkingHistory[key] || [];
                if (hist.length > 0) {
                    this.renderThinkingHistory();
                } else {
                    targetEl.textContent = '';
                }
                return;
            }

            const text = this.sanitizeText(content);
            const shortText =
                !text || text.length > 40 || text.includes('{') ? '思考中' : text;
            this.showThinkingIndicator(shortText, isSente);
            const hist = this.aiThinkingHistory[key] || [];
            if (hist.length > 0) {
                this.renderThinkingHistory();
            } else {
                targetEl.textContent = '';
            }
        }
    }
    handleAiError(errorMessage, player, modelName) {
        const isSente = player === PLAYER.SENTE;
        const target = isSente ? this.aiThinkingSenteElement : this.aiThinkingGoteElement;
        const title = isSente ? this.aiThinkingTitleSente : this.aiThinkingTitleGote;
        if (title && modelName) {
            title.textContent = `${isSente ? '先手' : '後手'}（${modelName}）の思考`;
        }
        this.hideThinkingIndicator(isSente);
        if (!target) return;
        target.innerHTML = '';
        const safeText = this.sanitizeText(errorMessage || 'AIエラーが発生しました');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'ai-error-message';
        errorDiv.textContent = safeText;
        errorDiv.style.color = '#d32f2f';
        errorDiv.style.padding = '10px';
        errorDiv.style.backgroundColor = '#ffebee';
        errorDiv.style.border = '1px solid #ef9a9a';
        errorDiv.style.borderRadius = '4px';
        errorDiv.style.marginBottom = '10px';
        errorDiv.style.whiteSpace = 'pre-wrap';
        target.appendChild(errorDiv);

        const retryBtn = document.createElement('button');
        retryBtn.textContent = '再生成する';
        retryBtn.className = 'retry-btn';
        retryBtn.style.padding = '6px 12px';
        retryBtn.style.marginTop = '6px';
        retryBtn.onclick = () => {
            retryBtn.disabled = true;
            retryBtn.textContent = '再生成中...';
            this.game.retryBotMove();
        };
        target.appendChild(retryBtn);
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

    /** 先手/後手別の思考履歴を描画 */
    renderThinkingHistory() {
        const renderOne = (key, element) => {
            if (!element) return;
            element.innerHTML = '';
            const hist = this.aiThinkingHistory[key];
            if (!hist || hist.length === 0) {
                element.textContent = '思考履歴はありません';
                return;
            }
            hist.forEach((entry, idx) => {
                const block = this.createMoveBlock(entry, idx === hist.length - 1);
                element.appendChild(block);
            });
            element.scrollTop = element.scrollHeight;
        };
        renderOne('sente', this.aiThinkingSenteElement);
        renderOne('gote', this.aiThinkingGoteElement);
    }

    /** 思考インジケータ（タイトル横）を表示 */
    showThinkingIndicator(text = '思考中...', isSente = true) {
        const title = isSente ? this.aiThinkingTitleSente : this.aiThinkingTitleGote;
        const key = isSente ? 'sente' : 'gote';
        if (!title) return;
        if (!this.aiThinkingIndicator[key]) {
            const span = document.createElement('span');
            span.className = 'ai-thinking-indicator';
            title.appendChild(span);
            this.aiThinkingIndicator[key] = span;
        }
        this.aiThinkingIndicator[key].textContent = ` (${text})`;
    }

    hideThinkingIndicator(isSente = true) {
        const key = isSente ? 'sente' : 'gote';
        const indicator = this.aiThinkingIndicator[key];
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
        this.aiThinkingIndicator[key] = null;
    }

    openHowToModal() {
        if (this.howToModal) {
            this.howToModal.style.display = 'block';
        }
    }

    closeHowToModal() {
        if (this.howToModal) {
            this.howToModal.style.display = 'none';
        }
    }

    /**
     * モードに応じて思考欄の表示/非表示を切り替える
     * human: 両方非表示
     * llm: 後手のみ表示（AIが後手）
     * llm-vs-llm: 両方表示
     */
    updateThinkingVisibility(mode) {
        const showBoth = mode === 'llm-vs-llm';
        const showGote = showBoth || mode === 'llm';
        const showSente = showBoth;

        // 並び順: 左に先手、右に後手
        if (this.aiThinkingBlockSente) this.aiThinkingBlockSente.style.order = '1';
        if (this.aiThinkingBlockGote) this.aiThinkingBlockGote.style.order = '2';

        if (this.aiThinkingBlockSente) {
            this.aiThinkingBlockSente.style.display = showSente ? 'block' : 'none';
            if (!showSente) {
                this.aiThinkingSenteElement && (this.aiThinkingSenteElement.textContent = '');
                this.aiThinkingHistory.sente = [];
                this.hideThinkingIndicator(true);
            }
        }
        if (this.aiThinkingBlockGote) {
            this.aiThinkingBlockGote.style.display = showGote ? 'block' : 'none';
            if (!showGote) {
                this.aiThinkingGoteElement && (this.aiThinkingGoteElement.textContent = '');
                this.aiThinkingHistory.gote = [];
                this.hideThinkingIndicator(false);
            }
        }
    }
}


