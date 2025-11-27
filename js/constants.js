/**
 * 将棋ゲームの定数定義
 */

// 駒の種類
const PIECE_TYPES = {
    EMPTY: 0,
    FU: 1,      // 歩兵
    KYO: 2,     // 香車
    KEI: 3,     // 桂馬
    GIN: 4,     // 銀将
    KIN: 5,     // 金将
    KAKU: 6,    // 角行
    HISHA: 7,   // 飛車
    GYOKU: 8,   // 玉将
    TO: 11,     // と金
    NKYO: 12,   // 成香
    NKEI: 13,   // 成桂
    NGIN: 14,   // 成銀
    UMA: 16,    // 馬
    RYU: 17     // 龍
};

// プレイヤー
const PLAYER = {
    SENTE: 0,
    GOTE: 1
};

// 盤面サイズ
const BOARD_SIZE = { ROWS: 9, COLS: 9 };

// 駒の表示名
const PIECE_NAMES = {
    [PIECE_TYPES.FU]: '歩',
    [PIECE_TYPES.KYO]: '香',
    [PIECE_TYPES.KEI]: '桂',
    [PIECE_TYPES.GIN]: '銀',
    [PIECE_TYPES.KIN]: '金',
    [PIECE_TYPES.KAKU]: '角',
    [PIECE_TYPES.HISHA]: '飛',
    [PIECE_TYPES.GYOKU]: '玉',
    [PIECE_TYPES.TO]: 'と',
    [PIECE_TYPES.NKYO]: '成香',
    [PIECE_TYPES.NKEI]: '成桂',
    [PIECE_TYPES.NGIN]: '成銀',
    [PIECE_TYPES.UMA]: '馬',
    [PIECE_TYPES.RYU]: '龍'
};

// 初期配置
const INITIAL_BOARD = [
    [
        { type: PIECE_TYPES.KYO, player: PLAYER.GOTE },
        { type: PIECE_TYPES.KEI, player: PLAYER.GOTE },
        { type: PIECE_TYPES.GIN, player: PLAYER.GOTE },
        { type: PIECE_TYPES.KIN, player: PLAYER.GOTE },
        { type: PIECE_TYPES.GYOKU, player: PLAYER.GOTE },
        { type: PIECE_TYPES.KIN, player: PLAYER.GOTE },
        { type: PIECE_TYPES.GIN, player: PLAYER.GOTE },
        { type: PIECE_TYPES.KEI, player: PLAYER.GOTE },
        { type: PIECE_TYPES.KYO, player: PLAYER.GOTE }
    ],
    [
        { type: PIECE_TYPES.EMPTY, player: null },
        { type: PIECE_TYPES.HISHA, player: PLAYER.GOTE },
        { type: PIECE_TYPES.EMPTY, player: null },
        { type: PIECE_TYPES.EMPTY, player: null },
        { type: PIECE_TYPES.EMPTY, player: null },
        { type: PIECE_TYPES.EMPTY, player: null },
        { type: PIECE_TYPES.EMPTY, player: null },
        { type: PIECE_TYPES.KAKU, player: PLAYER.GOTE },
        { type: PIECE_TYPES.EMPTY, player: null }
    ],
    [
        { type: PIECE_TYPES.FU, player: PLAYER.GOTE },
        { type: PIECE_TYPES.FU, player: PLAYER.GOTE },
        { type: PIECE_TYPES.FU, player: PLAYER.GOTE },
        { type: PIECE_TYPES.FU, player: PLAYER.GOTE },
        { type: PIECE_TYPES.FU, player: PLAYER.GOTE },
        { type: PIECE_TYPES.FU, player: PLAYER.GOTE },
        { type: PIECE_TYPES.FU, player: PLAYER.GOTE },
        { type: PIECE_TYPES.FU, player: PLAYER.GOTE },
        { type: PIECE_TYPES.FU, player: PLAYER.GOTE }
    ],
    Array(BOARD_SIZE.COLS).fill().map(() => ({ type: PIECE_TYPES.EMPTY, player: null })),
    Array(BOARD_SIZE.COLS).fill().map(() => ({ type: PIECE_TYPES.EMPTY, player: null })),
    Array(BOARD_SIZE.COLS).fill().map(() => ({ type: PIECE_TYPES.EMPTY, player: null })),
    [
        { type: PIECE_TYPES.FU, player: PLAYER.SENTE },
        { type: PIECE_TYPES.FU, player: PLAYER.SENTE },
        { type: PIECE_TYPES.FU, player: PLAYER.SENTE },
        { type: PIECE_TYPES.FU, player: PLAYER.SENTE },
        { type: PIECE_TYPES.FU, player: PLAYER.SENTE },
        { type: PIECE_TYPES.FU, player: PLAYER.SENTE },
        { type: PIECE_TYPES.FU, player: PLAYER.SENTE },
        { type: PIECE_TYPES.FU, player: PLAYER.SENTE },
        { type: PIECE_TYPES.FU, player: PLAYER.SENTE }
    ],
    [
        { type: PIECE_TYPES.EMPTY, player: null },
        { type: PIECE_TYPES.KAKU, player: PLAYER.SENTE },
        { type: PIECE_TYPES.EMPTY, player: null },
        { type: PIECE_TYPES.EMPTY, player: null },
        { type: PIECE_TYPES.EMPTY, player: null },
        { type: PIECE_TYPES.EMPTY, player: null },
        { type: PIECE_TYPES.EMPTY, player: null },
        { type: PIECE_TYPES.HISHA, player: PLAYER.SENTE },
        { type: PIECE_TYPES.EMPTY, player: null }
    ],
    [
        { type: PIECE_TYPES.KYO, player: PLAYER.SENTE },
        { type: PIECE_TYPES.KEI, player: PLAYER.SENTE },
        { type: PIECE_TYPES.GIN, player: PLAYER.SENTE },
        { type: PIECE_TYPES.KIN, player: PLAYER.SENTE },
        { type: PIECE_TYPES.GYOKU, player: PLAYER.SENTE },
        { type: PIECE_TYPES.KIN, player: PLAYER.SENTE },
        { type: PIECE_TYPES.GIN, player: PLAYER.SENTE },
        { type: PIECE_TYPES.KEI, player: PLAYER.SENTE },
        { type: PIECE_TYPES.KYO, player: PLAYER.SENTE }
    ]
];

// 成り対応
const PROMOTION_MAP = {
    [PIECE_TYPES.FU]: PIECE_TYPES.TO,
    [PIECE_TYPES.KYO]: PIECE_TYPES.NKYO,
    [PIECE_TYPES.KEI]: PIECE_TYPES.NKEI,
    [PIECE_TYPES.GIN]: PIECE_TYPES.NGIN,
    [PIECE_TYPES.KAKU]: PIECE_TYPES.UMA,
    [PIECE_TYPES.HISHA]: PIECE_TYPES.RYU
};

const CANNOT_PROMOTE = [
    PIECE_TYPES.KIN,
    PIECE_TYPES.GYOKU,
    PIECE_TYPES.TO,
    PIECE_TYPES.NKYO,
    PIECE_TYPES.NKEI,
    PIECE_TYPES.NGIN,
    PIECE_TYPES.UMA,
    PIECE_TYPES.RYU
];

const UNPROMOTED_PIECE = {
    [PIECE_TYPES.TO]: PIECE_TYPES.FU,
    [PIECE_TYPES.NKYO]: PIECE_TYPES.KYO,
    [PIECE_TYPES.NKEI]: PIECE_TYPES.KEI,
    [PIECE_TYPES.NGIN]: PIECE_TYPES.GIN,
    [PIECE_TYPES.UMA]: PIECE_TYPES.KAKU,
    [PIECE_TYPES.RYU]: PIECE_TYPES.HISHA
};

// 移動方向（先手視点）
const MOVE_DIRECTIONS = {
    [PIECE_TYPES.FU]: [ { row: -1, col: 0 } ],
    [PIECE_TYPES.KYO]: [ { row: -1, col: 0, sliding: true } ],
    [PIECE_TYPES.KEI]: [ { row: -2, col: -1 }, { row: -2, col: 1 } ],
    [PIECE_TYPES.GIN]: [
        { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
        { row: 1, col: -1 }, { row: 1, col: 1 }
    ],
    [PIECE_TYPES.KIN]: [
        { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
        { row: 0, col: -1 }, { row: 0, col: 1 }, { row: 1, col: 0 }
    ],
    [PIECE_TYPES.KAKU]: [
        { row: -1, col: -1, sliding: true }, { row: -1, col: 1, sliding: true },
        { row: 1, col: -1, sliding: true }, { row: 1, col: 1, sliding: true }
    ],
    [PIECE_TYPES.HISHA]: [
        { row: -1, col: 0, sliding: true }, { row: 0, col: -1, sliding: true },
        { row: 0, col: 1, sliding: true }, { row: 1, col: 0, sliding: true }
    ],
    [PIECE_TYPES.GYOKU]: [
        { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
        { row: 0, col: -1 }, { row: 0, col: 1 },
        { row: 1, col: -1 }, { row: 1, col: 0 }, { row: 1, col: 1 }
    ],
    [PIECE_TYPES.TO]: [
        { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
        { row: 0, col: -1 }, { row: 0, col: 1 }, { row: 1, col: 0 }
    ],
    [PIECE_TYPES.NKYO]: [
        { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
        { row: 0, col: -1 }, { row: 0, col: 1 }, { row: 1, col: 0 }
    ],
    [PIECE_TYPES.NKEI]: [
        { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
        { row: 0, col: -1 }, { row: 0, col: 1 }, { row: 1, col: 0 }
    ],
    [PIECE_TYPES.NGIN]: [
        { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
        { row: 0, col: -1 }, { row: 0, col: 1 }, { row: 1, col: 0 }
    ],
    [PIECE_TYPES.UMA]: [
        { row: -1, col: -1, sliding: true }, { row: -1, col: 1, sliding: true },
        { row: 1, col: -1, sliding: true }, { row: 1, col: 1, sliding: true },
        { row: -1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 }, { row: 1, col: 0 }
    ],
    [PIECE_TYPES.RYU]: [
        { row: -1, col: 0, sliding: true }, { row: 0, col: -1, sliding: true },
        { row: 0, col: 1, sliding: true }, { row: 1, col: 0, sliding: true },
        { row: -1, col: -1 }, { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 1, col: 1 }
    ]
};

// LLMモデル設定（思考バリエーションを含めて表示用に分割）
const LLM_MODELS = {
    GPT51_LOW: {
        name: 'GPT-5.1 Low',
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-5.1',
        keyName: 'gpt51Key',
        reasoningEffort: 'low'
    },
    GPT51_MEDIUM: {
        name: 'GPT-5.1 Medium',
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-5.1',
        keyName: 'gpt51Key',
        reasoningEffort: 'medium'
    },
    GPT51_HIGH: {
        name: 'GPT-5.1 High',
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-5.1',
        keyName: 'gpt51Key',
        reasoningEffort: 'high'
    },
    GEMINI_FLASH: {
        name: 'Gemini Flash',
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
        model: 'gemini-flash-latest',
        keyName: 'geminiKey',
        thinkingMode: 'off'
    },
    GEMINI_FLASH_THINK: {
        name: 'Gemini Flash Thinking',
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
        model: 'gemini-flash-latest',
        keyName: 'geminiKey',
        thinkingMode: 'on'
    },
    GEMINI3_PRO_HIGH: {
        name: 'Gemini 3 Pro high',
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent',
        model: 'gemini-3-pro-preview',
        keyName: 'geminiKey',
        thinkingLevel: 'high'
    },
    GEMINI3_PRO_LOW: {
        name: 'Gemini 3 Pro low',
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent',
        model: 'gemini-3-pro-preview',
        keyName: 'geminiKey',
        thinkingLevel: 'low'
    }
};
