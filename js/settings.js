/**
 * 設定を管理するクラス
 */
class Settings {
    /**
     * 設定のインスタンスを作成
     */
    constructor() {
        // APIキーの設定
        this.apiKeys = {
            gpt4oKey: null,
            o3miniKey: null,
            claudeKey: null,
            geminiFlashKey: null,
            geminiProKey: null
        };
        
        // LLMモデルの設定
        this.llmModels = Object.keys(LLM_MODELS);
        this.selectedModel = 'GPT4O'; // デフォルトモデル
        
        // 設定の読み込み
        this.loadSettings();
    }
    
    /**
     * 設定を読み込む
     */
    loadSettings() {
        // APIキーの読み込み
        Object.values(LLM_MODELS).forEach(model => {
            const key = localStorage.getItem(model.keyName);
            if (key) {
                this.apiKeys[model.keyName] = key;
            }
        });
        
        // 選択されたモデルの読み込み
        const selectedModel = localStorage.getItem('selectedModel');
        if (selectedModel && this.llmModels.includes(selectedModel)) {
            this.selectedModel = selectedModel;
        }
    }
    
    /**
     * 設定を保存
     */
    saveSettings() {
        // APIキーの保存
        Object.entries(this.apiKeys).forEach(([key, value]) => {
            if (value) {
                localStorage.setItem(key, value);
            } else {
                localStorage.removeItem(key);
            }
        });
        
        // 選択されたモデルの保存
        localStorage.setItem('selectedModel', this.selectedModel);
    }
    
    /**
     * APIキーを設定
     * @param {string} modelKey - モデルのキー
     * @param {string} apiKey - APIキー
     */
    setApiKey(modelKey, apiKey) {
        if (LLM_MODELS[modelKey]) {
            this.apiKeys[LLM_MODELS[modelKey].keyName] = apiKey;
            this.saveSettings();
        }
    }
    
    /**
     * APIキーを取得
     * @param {string} modelKey - モデルのキー
     * @returns {string|null} APIキー
     */
    getApiKey(modelKey) {
        if (LLM_MODELS[modelKey]) {
            return this.apiKeys[LLM_MODELS[modelKey].keyName];
        }
        return null;
    }
    
    /**
     * 選択されたモデルを設定
     * @param {string} modelKey - モデルのキー
     */
    setSelectedModel(modelKey) {
        if (this.llmModels.includes(modelKey)) {
            this.selectedModel = modelKey;
            this.saveSettings();
        }
    }
    
    /**
     * 選択されたモデルを取得
     * @returns {string} モデルのキー
     */
    getSelectedModel() {
        return this.selectedModel;
    }
    
    /**
     * 選択されたモデルのAPIキーが設定されているかどうかをチェック
     * @returns {boolean} APIキーが設定されている場合はtrue
     */
    hasSelectedModelApiKey() {
        return !!this.getApiKey(this.selectedModel);
    }
    
    /**
     * 設定されているAPIキーを持つモデルのリストを取得
     * @returns {Array<string>} モデルのキーのリスト
     */
    getAvailableModels() {
        return this.llmModels.filter(modelKey => this.getApiKey(modelKey));
    }
    
    /**
     * すべてのAPIキーをクリア
     */
    clearAllApiKeys() {
        Object.keys(this.apiKeys).forEach(key => {
            this.apiKeys[key] = null;
            localStorage.removeItem(key);
        });
    }
    
    /**
     * 設定をエクスポート
     * @returns {Object} エクスポートされた設定
     */
    exportSettings() {
        return {
            apiKeys: { ...this.apiKeys },
            selectedModel: this.selectedModel
        };
    }
    
    /**
     * 設定をインポート
     * @param {Object} settings - インポートする設定
     */
    importSettings(settings) {
        if (settings.apiKeys) {
            this.apiKeys = { ...settings.apiKeys };
        }
        
        if (settings.selectedModel && this.llmModels.includes(settings.selectedModel)) {
            this.selectedModel = settings.selectedModel;
        }
        
        this.saveSettings();
    }
}

/**
 * LLMモデルの選択肢を生成
 * @returns {string} モデル選択のHTMLオプション
 */
function generateModelOptions() {
    let options = '';
    
    Object.entries(LLM_MODELS).forEach(([key, model]) => {
        options += `<option value="${key}">${model.name}</option>`;
    });
    
    return options;
}

/**
 * LLMモデル選択UIを作成
 * @param {HTMLElement} container - UIを追加するコンテナ要素
 * @param {Settings} settings - 設定のインスタンス
 * @param {Function} onModelChange - モデル変更時のコールバック関数
 */
function createModelSelector(container, settings, onModelChange) {
    // すでに存在する場合は削除
    const existingSelector = document.getElementById('llmModelSelector');
    if (existingSelector) {
        existingSelector.remove();
    }
    
    // モデル選択UIを作成
    const selectorContainer = document.createElement('div');
    selectorContainer.id = 'llmModelSelector';
    selectorContainer.className = 'model-selector';
    
    const label = document.createElement('label');
    label.textContent = 'LLMモデル: ';
    label.htmlFor = 'modelSelect';
    selectorContainer.appendChild(label);
    
    const select = document.createElement('select');
    select.id = 'modelSelect';
    select.innerHTML = generateModelOptions();
    select.value = settings.getSelectedModel();
    
    // モデル変更イベント
    select.addEventListener('change', () => {
        settings.setSelectedModel(select.value);
        if (onModelChange) {
            onModelChange(select.value);
        }
    });
    
    selectorContainer.appendChild(select);
    
    // APIキー設定ボタン
    const settingsButton = document.createElement('button');
    settingsButton.textContent = 'API設定';
    settingsButton.addEventListener('click', () => {
        // 設定モーダルを開く
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.style.display = 'block';
        }
    });
    
    selectorContainer.appendChild(settingsButton);
    
    // コンテナに追加
    container.appendChild(selectorContainer);
}

/**
 * 設定モーダルのスタイルを追加
 */
function addSettingsModalStyles() {
    // すでに存在する場合は何もしない
    if (document.getElementById('settingsModalStyles')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'settingsModalStyles';
    style.textContent = `
        .model-selector {
            margin: 10px 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .model-selector select {
            padding: 5px;
            border-radius: 4px;
            border: 1px solid #ddd;
        }
        
        .promotion-dialog {
            position: absolute;
            background-color: white;
            border: 2px solid #333;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            z-index: 1000;
            text-align: center;
        }
        
        .promotion-dialog button {
            margin: 5px;
            padding: 5px 10px;
        }
        
        .captured-piece {
            display: inline-block;
            margin: 5px;
            padding: 5px 10px;
            background-color: #f8c06c;
            border: 1px solid #333;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .captured-piece:hover {
            background-color: #f0b050;
        }
    `;
    
    document.head.appendChild(style);
}
