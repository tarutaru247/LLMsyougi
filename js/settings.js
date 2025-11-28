/**
 * 設定を管理するクラス
 */
class Settings {
    constructor() {
        this.apiKeys = { gpt51Key: null, geminiKey: null, dummyKey: 'N/A' };
        this.gemini3Thinking = 'high';   // 'high' | 'low'
        this.geminiFlashThinking = 'on'; // 'on' | 'off'
        this.llmModels = Object.keys(LLM_MODELS);
        this.selectedModel = 'GPT51_MEDIUM';
        this.selectedModelSente = this.selectedModel;
        this.selectedModelGote = this.selectedModel;
        this.storageMode = 'local'; // 'local' | 'session'
        this.loadSettings();
    }

    loadSettings() {
        // APIキー: sessionStorage を優先、なければ localStorage
        Object.values(LLM_MODELS).forEach(model => {
            const sessionKey = sessionStorage.getItem(model.keyName);
            const localKey = localStorage.getItem(model.keyName);
            const key = sessionKey || localKey || null;
            if (key) this.apiKeys[model.keyName] = key;
        });

        const storedMode = sessionStorage.getItem('storageMode') || localStorage.getItem('storageMode');
        if (storedMode === 'session' || storedMode === 'local') this.storageMode = storedMode;

        const selectedModel = localStorage.getItem('selectedModel');
        if (selectedModel && this.llmModels.includes(selectedModel)) {
            this.selectedModel = selectedModel;
        }
        const selectedSente = localStorage.getItem('selectedModelSente');
        if (selectedSente && this.llmModels.includes(selectedSente)) {
            this.selectedModelSente = selectedSente;
        } else {
            this.selectedModelSente = this.selectedModel;
        }
        const selectedGote = localStorage.getItem('selectedModelGote');
        if (selectedGote && this.llmModels.includes(selectedGote)) {
            this.selectedModelGote = selectedGote;
        } else {
            this.selectedModelGote = this.selectedModel;
        }
        const g3 = localStorage.getItem('gemini3Thinking');
        if (g3 === 'high' || g3 === 'low') this.gemini3Thinking = g3;
        const gf = localStorage.getItem('geminiFlashThinking');
        if (gf === 'on' || gf === 'off') this.geminiFlashThinking = gf;
    }

    /**
     * APIキー・モデル選択を保存
     * @param {'local'|'session'} mode
     */
    saveSettings(mode = 'local') {
        this.storageMode = mode;
        this.persistApiKeys(mode);
        localStorage.setItem('selectedModel', this.selectedModel);
        localStorage.setItem('selectedModelSente', this.selectedModelSente);
        localStorage.setItem('selectedModelGote', this.selectedModelGote);
        localStorage.setItem('gemini3Thinking', this.gemini3Thinking);
        localStorage.setItem('geminiFlashThinking', this.geminiFlashThinking);
        localStorage.setItem('botThinkingMode', this.botThinkingMode);
        // ストレージモードは両方に記録（次回起動時に参照しやすくするため）
        localStorage.setItem('storageMode', mode);
        sessionStorage.setItem('storageMode', mode);
    }

    persistApiKeys(mode) {
        const target = mode === 'session' ? sessionStorage : localStorage;
        const other = mode === 'session' ? localStorage : sessionStorage;
        Object.entries(this.apiKeys).forEach(([key, value]) => {
            if (value) target.setItem(key, value);
            else target.removeItem(key);
            // 片方に保存するときはもう片方から削除して残留を防ぐ
            other.removeItem(key);
        });
    }

    setApiKey(modelKey, apiKey, mode = this.storageMode) {
        if (LLM_MODELS[modelKey]) {
            this.apiKeys[LLM_MODELS[modelKey].keyName] = apiKey;
            this.saveSettings(mode);
        }
    }

    getApiKey(modelKey) {
        return LLM_MODELS[modelKey] ? this.apiKeys[LLM_MODELS[modelKey].keyName] : null;
    }

    setSelectedModel(modelKey) {
        if (this.llmModels.includes(modelKey)) {
            this.selectedModel = modelKey;
            this.saveSettings(this.storageMode);
        }
    }

    setSelectedModelForPlayer(player, modelKey) {
        if (!this.llmModels.includes(modelKey)) return;
        if (player === PLAYER.SENTE) {
            this.selectedModelSente = modelKey;
        } else {
            this.selectedModelGote = modelKey;
        }
        this.saveSettings(this.storageMode);
    }

    getSelectedModelForPlayer(player) {
        return player === PLAYER.SENTE ? this.selectedModelSente : this.selectedModelGote;
    }

    getSelectedModel() {
        return this.selectedModel;
    }

    setGemini3Thinking(level) {
        if (level === 'high' || level === 'low') {
            this.gemini3Thinking = level;
            this.saveSettings(this.storageMode);
        }
    }

    getGemini3Thinking() {
        return this.gemini3Thinking;
    }

    setGeminiFlashThinking(mode) {
        if (mode === 'on' || mode === 'off') {
            this.geminiFlashThinking = mode;
            this.saveSettings(this.storageMode);
        }
    }

    getGeminiFlashThinking() {
        return this.geminiFlashThinking;
    }

    setBotThinkingMode(mode) {
        if (mode === 'select' || mode === 'generate') {
            this.botThinkingMode = mode;
            this.saveSettings(this.storageMode);
        }
    }

    getBotThinkingMode() {
        return this.botThinkingMode;
    }

    hasSelectedModelApiKey() {
        return !!this.getApiKey(this.selectedModel);
    }

    hasSelectedModelApiKeyForPlayer(player) {
        const modelKey = this.getSelectedModelForPlayer(player);
        return !!this.getApiKey(modelKey);
    }

    getAvailableModels() {
        return this.llmModels.filter(m => this.getApiKey(m));
    }

    clearAllApiKeys() {
        Object.keys(this.apiKeys).forEach(key => {
            this.apiKeys[key] = null;
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    }

    exportSettings() {
        return {
            apiKeys: { ...this.apiKeys },
            selectedModel: this.selectedModel,
            selectedModelSente: this.selectedModelSente,
            selectedModelGote: this.selectedModelGote,
            gemini3Thinking: this.gemini3Thinking,
            geminiFlashThinking: this.geminiFlashThinking,
            botThinkingMode: this.botThinkingMode,
            storageMode: this.storageMode
        };
    }

    importSettings(settings) {
        if (settings.apiKeys) this.apiKeys = { ...settings.apiKeys };
        if (settings.selectedModel && this.llmModels.includes(settings.selectedModel)) {
            this.selectedModel = settings.selectedModel;
        }
        if (settings.selectedModelSente && this.llmModels.includes(settings.selectedModelSente)) {
            this.selectedModelSente = settings.selectedModelSente;
        }
        if (settings.selectedModelGote && this.llmModels.includes(settings.selectedModelGote)) {
            this.selectedModelGote = settings.selectedModelGote;
        }
        if (settings.gemini3Thinking === 'high' || settings.gemini3Thinking === 'low') {
            this.gemini3Thinking = settings.gemini3Thinking;
        }
        if (settings.geminiFlashThinking === 'on' || settings.geminiFlashThinking === 'off') {
            this.geminiFlashThinking = settings.geminiFlashThinking;
        }
        if (settings.botThinkingMode === 'select' || settings.botThinkingMode === 'generate') {
            this.botThinkingMode = settings.botThinkingMode;
        }
        if (settings.storageMode === 'session' || settings.storageMode === 'local') {
            this.storageMode = settings.storageMode;
        }
        this.saveSettings(this.storageMode);
    }
}

function generateModelOptions() {
    let options = '';
    Object.entries(LLM_MODELS).forEach(([key, model]) => {
        options += `<option value="${key}">${model.name}</option>`;
    });
    return options;
}

function createModelSelector(container, settings, onModelChange) {
    // 既存のセレクタがあれば削除（再描画用）
    const existingSelector = document.getElementById('llmModelSelector');
    if (existingSelector) existingSelector.remove();

    const wrapper = document.createElement('div');
    wrapper.id = 'llmModelSelector';
    
    // 横並び用のスタイル
    wrapper.style.display = 'contents'; // 親のflex設定に従う
    
    // --- 1. モデル選択エリア ---
    const modelContainer = document.createElement('div');
    modelContainer.className = 'model-selector duo';
    modelContainer.style.margin = '0';
    modelContainer.style.display = 'flex';
    modelContainer.style.gap = '10px';
    modelContainer.style.alignItems = 'center';

    // 先手モデル
    const labelS = document.createElement('label');
    labelS.textContent = '先手モデル: ';
    labelS.htmlFor = 'modelSelectSente';
    modelContainer.appendChild(labelS);

    const selectS = document.createElement('select');
    selectS.id = 'modelSelectSente';
    selectS.innerHTML = generateModelOptions();
    selectS.value = settings.getSelectedModelForPlayer(PLAYER.SENTE);
    selectS.addEventListener('change', () => {
        settings.setSelectedModelForPlayer(PLAYER.SENTE, selectS.value);
        if (onModelChange) onModelChange(selectS.value);
    });
    modelContainer.appendChild(selectS);

    // 後手モデル
    const labelG = document.createElement('label');
    labelG.textContent = '後手モデル: ';
    labelG.htmlFor = 'modelSelectGote';
    modelContainer.appendChild(labelG);

    const selectG = document.createElement('select');
    selectG.id = 'modelSelectGote';
    selectG.innerHTML = generateModelOptions();
    selectG.value = settings.getSelectedModelForPlayer(PLAYER.GOTE);
    selectG.addEventListener('change', () => {
        settings.setSelectedModelForPlayer(PLAYER.GOTE, selectG.value);
        if (onModelChange) onModelChange(selectG.value);
    });
    modelContainer.appendChild(selectG);
    
    wrapper.appendChild(modelContainer);

    // --- 2. 思考モード選択エリア ---
    const modeContainer = document.createElement('div');
    modeContainer.style.display = 'flex';
    modeContainer.style.alignItems = 'center';
    modeContainer.style.gap = '10px';
    
    const modeLabel = document.createElement('span');
    modeLabel.textContent = '思考モード:';
    modeLabel.style.fontWeight = 'bold';
    modeContainer.appendChild(modeLabel);

    const radioGroup = document.createElement('div');
    radioGroup.className = 'radio-group';
    radioGroup.style.margin = '0';
    radioGroup.style.display = 'flex';
    radioGroup.style.gap = '10px';

    // 選択式
    const labelSelect = document.createElement('label');
    labelSelect.style.cursor = 'pointer';
    const radioSelect = document.createElement('input');
    radioSelect.type = 'radio';
    radioSelect.name = 'botThinkingMode';
    radioSelect.value = 'select';
    radioSelect.checked = settings.getBotThinkingMode() === 'select';
    radioSelect.addEventListener('change', () => settings.setBotThinkingMode('select'));
    labelSelect.appendChild(radioSelect);
    labelSelect.appendChild(document.createTextNode(' 選択式 (正確)'));
    radioGroup.appendChild(labelSelect);

    // 生成式
    const labelGen = document.createElement('label');
    labelGen.style.cursor = 'pointer';
    const radioGen = document.createElement('input');
    radioGen.type = 'radio';
    radioGen.name = 'botThinkingMode';
    radioGen.value = 'generate';
    radioGen.checked = settings.getBotThinkingMode() === 'generate';
    radioGen.addEventListener('change', () => settings.setBotThinkingMode('generate'));
    labelGen.appendChild(radioGen);
    labelGen.appendChild(document.createTextNode(' 生成式 (自由)'));
    radioGroup.appendChild(labelGen);

    modeContainer.appendChild(radioGroup);

    wrapper.appendChild(modeContainer);

    // 説明文
    const note = document.createElement('div');
    note.style.fontSize = '12px';
    note.style.color = '#666';
    note.style.marginLeft = '10px';
    note.textContent = '※ 選択式: 合法手のリストから手を選択します。反則をしませんがAIが本領を発揮できない可能性があります。/ 生成式: 自力で手を考えます。反則をする場合があります。';
    wrapper.appendChild(note);

    container.appendChild(wrapper);
}

function addSettingsModalStyles() {
    if (document.getElementById('settingsModalStyles')) return;
    const style = document.createElement('style');
    style.id = 'settingsModalStyles';
    style.textContent = `
        .model-selector { margin: 10px 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .model-selector.duo label { min-width: 80px; }
        .model-selector.duo select { min-width: 160px; }
        .model-selector select { padding: 5px; border-radius: 4px; border: 1px solid #ddd; }
        .radio-group { margin: 10px 0; display: flex; align-items: center; gap: 15px; }
        .radio-group label { cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .promotion-dialog { position: absolute; background: white; border: 2px solid #333; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.5); z-index: 1000; text-align: center; }
        .promotion-dialog button { margin: 5px; padding: 5px 10px; }
        .captured-piece { display: inline-block; margin: 5px; padding: 5px 10px; background-color: #f8c06c; border: 1px solid #333; border-radius: 4px; cursor: pointer; }
        .captured-piece:hover { background-color: #f0b050; }
        .api-save-buttons { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
        .api-save-buttons button { margin-right: 0; }
        .api-note { margin-top: 10px; font-size: 13px; color: #555; line-height: 1.4; }
    `;
    document.head.appendChild(style);
}
