/**
 * 設定を管理するクラス
 */
class Settings {
    constructor() {
        // APIキー
        this.apiKeys = {
            gpt51Key: null,
            geminiKey: null
        };

        // モデルごとの思考設定（モデル名で分岐）
        this.gemini3Thinking = 'high';   // 'high' | 'low'
        this.geminiFlashThinking = 'on'; // 'on' | 'off'

        this.llmModels = Object.keys(LLM_MODELS);
        this.selectedModel = 'GPT51_MEDIUM';

        this.loadSettings();
    }

    loadSettings() {
        Object.values(LLM_MODELS).forEach(model => {
            const key = localStorage.getItem(model.keyName);
            if (key) this.apiKeys[model.keyName] = key;
        });
        const selectedModel = localStorage.getItem('selectedModel');
        if (selectedModel && this.llmModels.includes(selectedModel)) {
            this.selectedModel = selectedModel;
        }
        const g3 = localStorage.getItem('gemini3Thinking');
        if (g3 === 'high' || g3 === 'low') this.gemini3Thinking = g3;
        const gf = localStorage.getItem('geminiFlashThinking');
        if (gf === 'on' || gf === 'off') this.geminiFlashThinking = gf;
    }

    saveSettings() {
        Object.entries(this.apiKeys).forEach(([key, value]) => {
            if (value) localStorage.setItem(key, value);
            else localStorage.removeItem(key);
        });
        localStorage.setItem('selectedModel', this.selectedModel);
        localStorage.setItem('gemini3Thinking', this.gemini3Thinking);
        localStorage.setItem('geminiFlashThinking', this.geminiFlashThinking);
    }

    setApiKey(modelKey, apiKey) {
        if (LLM_MODELS[modelKey]) {
            this.apiKeys[LLM_MODELS[modelKey].keyName] = apiKey;
            this.saveSettings();
        }
    }

    getApiKey(modelKey) {
        return LLM_MODELS[modelKey] ? this.apiKeys[LLM_MODELS[modelKey].keyName] : null;
    }

    setSelectedModel(modelKey) {
        if (this.llmModels.includes(modelKey)) {
            this.selectedModel = modelKey;
            this.saveSettings();
        }
    }

    getSelectedModel() {
        return this.selectedModel;
    }

    setGemini3Thinking(level) {
        if (level === 'high' || level === 'low') {
            this.gemini3Thinking = level;
            this.saveSettings();
        }
    }

    getGemini3Thinking() {
        return this.gemini3Thinking;
    }

    setGeminiFlashThinking(mode) {
        if (mode === 'on' || mode === 'off') {
            this.geminiFlashThinking = mode;
            this.saveSettings();
        }
    }

    getGeminiFlashThinking() {
        return this.geminiFlashThinking;
    }

    hasSelectedModelApiKey() {
        return !!this.getApiKey(this.selectedModel);
    }

    getAvailableModels() {
        return this.llmModels.filter(m => this.getApiKey(m));
    }

    clearAllApiKeys() {
        Object.keys(this.apiKeys).forEach(key => {
            this.apiKeys[key] = null;
            localStorage.removeItem(key);
        });
    }

    exportSettings() {
        return {
            apiKeys: { ...this.apiKeys },
            selectedModel: this.selectedModel,
            gemini3Thinking: this.gemini3Thinking,
            geminiFlashThinking: this.geminiFlashThinking
        };
    }

    importSettings(settings) {
        if (settings.apiKeys) this.apiKeys = { ...settings.apiKeys };
        if (settings.selectedModel && this.llmModels.includes(settings.selectedModel)) {
            this.selectedModel = settings.selectedModel;
        }
        if (settings.gemini3Thinking === 'high' || settings.gemini3Thinking === 'low') {
            this.gemini3Thinking = settings.gemini3Thinking;
        }
        if (settings.geminiFlashThinking === 'on' || settings.geminiFlashThinking === 'off') {
            this.geminiFlashThinking = settings.geminiFlashThinking;
        }
        this.saveSettings();
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
    const existingSelector = document.getElementById('llmModelSelector');
    if (existingSelector) existingSelector.remove();

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
    select.addEventListener('change', () => {
        settings.setSelectedModel(select.value);
        if (onModelChange) onModelChange(select.value);
    });
    selectorContainer.appendChild(select);

    const settingsButton = document.createElement('button');
    settingsButton.textContent = 'API設定';
    settingsButton.addEventListener('click', () => {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) settingsModal.style.display = 'block';
    });
    selectorContainer.appendChild(settingsButton);

    container.appendChild(selectorContainer);
}

function addSettingsModalStyles() {
    if (document.getElementById('settingsModalStyles')) return;
    const style = document.createElement('style');
    style.id = 'settingsModalStyles';
    style.textContent = `
        .model-selector { margin: 10px 0; display: flex; align-items: center; gap: 10px; }
        .model-selector select { padding: 5px; border-radius: 4px; border: 1px solid #ddd; }
        .promotion-dialog { position: absolute; background: white; border: 2px solid #333; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.5); z-index: 1000; text-align: center; }
        .promotion-dialog button { margin: 5px; padding: 5px 10px; }
        .captured-piece { display: inline-block; margin: 5px; padding: 5px 10px; background-color: #f8c06c; border: 1px solid #333; border-radius: 4px; cursor: pointer; }
        .captured-piece:hover { background-color: #f0b050; }
    `;
    document.head.appendChild(style);
}
