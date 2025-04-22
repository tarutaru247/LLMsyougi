/**
 * 将棋ゲームの定数を定義するファイル
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
    GYOKU: 8,   // 玉将/王将
    
    // 成り駒
    TO: 11,     // と金
    NKYO: 12,   // 成香
    NKEI: 13,   // 成桂
    NGIN: 14,   // 成銀
    UMA: 16,    // 馬
    RYU: 17     // 龍
};

// プレイヤー
const PLAYER = {
    SENTE: 0,   // 先手（下手）
    GOTE: 1     // 後手（上手）
};

// 盤面のサイズ
const BOARD_SIZE = {
    ROWS: 9,
    COLS: 9
};

// 駒の表示名（日本語）
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

// 駒の初期配置
const INITIAL_BOARD = [
    // 後手（上手）の駒
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
    // 空の行
    Array(BOARD_SIZE.COLS).fill().map(() => ({ type: PIECE_TYPES.EMPTY, player: null })),
    Array(BOARD_SIZE.COLS).fill().map(() => ({ type: PIECE_TYPES.EMPTY, player: null })),
    Array(BOARD_SIZE.COLS).fill().map(() => ({ type: PIECE_TYPES.EMPTY, player: null })),
    // 先手（下手）の駒
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

// 駒の成りの対応表
const PROMOTION_MAP = {
    [PIECE_TYPES.FU]: PIECE_TYPES.TO,
    [PIECE_TYPES.KYO]: PIECE_TYPES.NKYO,
    [PIECE_TYPES.KEI]: PIECE_TYPES.NKEI,
    [PIECE_TYPES.GIN]: PIECE_TYPES.NGIN,
    [PIECE_TYPES.KAKU]: PIECE_TYPES.UMA,
    [PIECE_TYPES.HISHA]: PIECE_TYPES.RYU
};

// 成れない駒のリスト
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

// 成り駒の元の駒
const UNPROMOTED_PIECE = {
    [PIECE_TYPES.TO]: PIECE_TYPES.FU,
    [PIECE_TYPES.NKYO]: PIECE_TYPES.KYO,
    [PIECE_TYPES.NKEI]: PIECE_TYPES.KEI,
    [PIECE_TYPES.NGIN]: PIECE_TYPES.GIN,
    [PIECE_TYPES.UMA]: PIECE_TYPES.KAKU,
    [PIECE_TYPES.RYU]: PIECE_TYPES.HISHA
};

// 駒の移動方向（相対座標）
// 先手（下手）の視点から見た方向
const MOVE_DIRECTIONS = {
    // 歩兵の動き
    [PIECE_TYPES.FU]: [
        { row: -1, col: 0 }  // 前
    ],
    
    // 香車の動き
    [PIECE_TYPES.KYO]: [
        { row: -1, col: 0, sliding: true }  // 前（無限）
    ],
    
    // 桂馬の動き
    [PIECE_TYPES.KEI]: [
        { row: -2, col: -1 },  // 左前桂馬跳び
        { row: -2, col: 1 }    // 右前桂馬跳び
    ],
    
    // 銀将の動き
    [PIECE_TYPES.GIN]: [
        { row: -1, col: -1 },  // 左前
        { row: -1, col: 0 },   // 前
        { row: -1, col: 1 },   // 右前
        { row: 1, col: -1 },   // 左後ろ
        { row: 1, col: 1 }     // 右後ろ
    ],
    
    // 金将の動き
    [PIECE_TYPES.KIN]: [
        { row: -1, col: -1 },  // 左前
        { row: -1, col: 0 },   // 前
        { row: -1, col: 1 },   // 右前
        { row: 0, col: -1 },   // 左
        { row: 0, col: 1 },    // 右
        { row: 1, col: 0 }     // 後ろ
    ],
    
    // 角行の動き
    [PIECE_TYPES.KAKU]: [
        { row: -1, col: -1, sliding: true },  // 左前（無限）
        { row: -1, col: 1, sliding: true },   // 右前（無限）
        { row: 1, col: -1, sliding: true },   // 左後ろ（無限）
        { row: 1, col: 1, sliding: true }     // 右後ろ（無限）
    ],
    
    // 飛車の動き
    [PIECE_TYPES.HISHA]: [
        { row: -1, col: 0, sliding: true },  // 前（無限）
        { row: 0, col: -1, sliding: true },  // 左（無限）
        { row: 0, col: 1, sliding: true },   // 右（無限）
        { row: 1, col: 0, sliding: true }    // 後ろ（無限）
    ],
    
    // 王将・玉将の動き
    [PIECE_TYPES.GYOKU]: [
        { row: -1, col: -1 },  // 左前
        { row: -1, col: 0 },   // 前
        { row: -1, col: 1 },   // 右前
        { row: 0, col: -1 },   // 左
        { row: 0, col: 1 },    // 右
        { row: 1, col: -1 },   // 左後ろ
        { row: 1, col: 0 },    // 後ろ
        { row: 1, col: 1 }     // 右後ろ
    ],
    
    // と金の動き（金と同じ）
    [PIECE_TYPES.TO]: [
        { row: -1, col: -1 },  // 左前
        { row: -1, col: 0 },   // 前
        { row: -1, col: 1 },   // 右前
        { row: 0, col: -1 },   // 左
        { row: 0, col: 1 },    // 右
        { row: 1, col: 0 }     // 後ろ
    ],
    
    // 成香の動き（金と同じ）
    [PIECE_TYPES.NKYO]: [
        { row: -1, col: -1 },  // 左前
        { row: -1, col: 0 },   // 前
        { row: -1, col: 1 },   // 右前
        { row: 0, col: -1 },   // 左
        { row: 0, col: 1 },    // 右
        { row: 1, col: 0 }     // 後ろ
    ],
    
    // 成桂の動き（金と同じ）
    [PIECE_TYPES.NKEI]: [
        { row: -1, col: -1 },  // 左前
        { row: -1, col: 0 },   // 前
        { row: -1, col: 1 },   // 右前
        { row: 0, col: -1 },   // 左
        { row: 0, col: 1 },    // 右
        { row: 1, col: 0 }     // 後ろ
    ],
    
    // 成銀の動き（金と同じ）
    [PIECE_TYPES.NGIN]: [
        { row: -1, col: -1 },  // 左前
        { row: -1, col: 0 },   // 前
        { row: -1, col: 1 },   // 右前
        { row: 0, col: -1 },   // 左
        { row: 0, col: 1 },    // 右
        { row: 1, col: 0 }     // 後ろ
    ],
    
    // 馬の動き（角＋王の十字）
    [PIECE_TYPES.UMA]: [
        { row: -1, col: -1, sliding: true },  // 左前（無限）
        { row: -1, col: 1, sliding: true },   // 右前（無限）
        { row: 1, col: -1, sliding: true },   // 左後ろ（無限）
        { row: 1, col: 1, sliding: true },    // 右後ろ（無限）
        { row: -1, col: 0 },   // 前
        { row: 0, col: -1 },   // 左
        { row: 0, col: 1 },    // 右
        { row: 1, col: 0 }     // 後ろ
    ],
    
    // 龍の動き（飛車＋王の斜め）
    [PIECE_TYPES.RYU]: [
        { row: -1, col: 0, sliding: true },  // 前（無限）
        { row: 0, col: -1, sliding: true },  // 左（無限）
        { row: 0, col: 1, sliding: true },   // 右（無限）
        { row: 1, col: 0, sliding: true },   // 後ろ（無限）
        { row: -1, col: -1 },  // 左前
        { row: -1, col: 1 },   // 右前
        { row: 1, col: -1 },   // 左後ろ
        { row: 1, col: 1 }     // 右後ろ
    ]
};

// LLMモデルの設定
const LLM_MODELS = {
    GPT4O: {
        name: 'GPT-4o',
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o',
        keyName: 'gpt4oKey'
    },
    O3: {
        name: 'o3',
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'o3',
        keyName: 'o3Key'
    },
    O4MINI: {
        name: 'o4-mini',
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'o4-mini',
        keyName: 'o4miniKey'
    },
    CLAUDE: {
        name: 'Claude 3.7 Sonnet',
        apiEndpoint: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-7-sonnet-20240620',
        keyName: 'claudeKey'
    },
    GEMINI_FLASH: {
        name: 'Gemini 2.0 Flash',
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        model: 'gemini-2.0-flash',
        keyName: 'geminiFlashKey'
    },
    GEMINI_PRO: {
        name: 'Gemini 2.5 Pro exp (03-25)', // モデル名を指定されたバージョンに合わせて変更
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-exp-03-25:generateContent', // エンドポイントを指定されたバージョンに更新
        model: 'gemini-2.5-pro-exp-03-25', // モデル識別子を指定されたバージョンに更新
        keyName: 'geminiProKey' // キー名は変更しない
    }
};
