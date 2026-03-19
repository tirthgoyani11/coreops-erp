/**
 * Kaggle Inference Service — Smart Fallback Bridge
 * 
 * 4-tier: Kimi K2.5 (NVIDIA) → Kaggle GPU → Ollama → Built-in
 * FAST: Health-checks once, then skips unreachable providers instantly.
 */

const logger = require('../utils/logger');
const kimiService = require('./kimiService');

const KAGGLE_URL = process.env.KAGGLE_INFERENCE_URL || '';
const KAGGLE_TIMEOUT = 120000;  // 120s max for huge Universal RAG context processing
const HEALTH_CHECK_INTERVAL = 60000; // Re-check every 60s

// Cached provider status — avoids timeout on every single request
let providerStatus = {
    kaggle: { available: null, lastCheck: 0 },
    ollama: { available: null, lastCheck: 0 },
};

function getProviderOrder(preferred) {
    const normalized = String(preferred || '').trim().toLowerCase();
    const valid = ['kimi', 'kaggle', 'ollama'];
    const defaultOrder = ['kimi', 'kaggle', 'ollama'];
    if (!valid.includes(normalized)) return defaultOrder;
    return [normalized, ...defaultOrder.filter((p) => p !== normalized)];
}

/**
 * Quick health probe — returns true/false in <3s
 */
async function probeProvider(name) {
    const now = Date.now();
    const cached = providerStatus[name];

    // Use cache if checked recently
    if (cached.available !== null && (now - cached.lastCheck) < HEALTH_CHECK_INTERVAL) {
        return cached.available;
    }

    try {
        if (name === 'kaggle') {
            if (!KAGGLE_URL) { cached.available = false; cached.lastCheck = now; return false; }
            const res = await fetch(`${KAGGLE_URL}/api/health`, {
                headers: { 'ngrok-skip-browser-warning': 'true' },
                signal: AbortSignal.timeout(3000)
            });
            cached.available = res.ok;
        } else if (name === 'ollama') {
            const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
            cached.available = res.ok;
        }
    } catch {
        cached.available = false;
    }
    cached.lastCheck = now;
    return cached.available;
}

/**
 * Call Kaggle inference endpoint (only if provider is up)
 */
async function callKaggle(endpoint, payload) {
    const isUp = await probeProvider('kaggle');
    if (!isUp) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), KAGGLE_TIMEOUT);

    try {
        const res = await fetch(`${KAGGLE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) {
            if (data.data && typeof data.data.text === 'string') {
                // Aggressively strip reasoning block even if opening <think> tag is missing
                let text = data.data.text;
                const thinkEndIndex = text.indexOf('</think>');
                if (thinkEndIndex !== -1) {
                    text = text.substring(thinkEndIndex + 8).trim();
                } else {
                    text = text.replace(/<think>[\s\S]*?<\/think>\n*/gi, '').trim();
                }
                data.data.text = text;
            }
            return data.data;
        }
        throw new Error(data.error || 'inference failed');
    } catch (err) {
        clearTimeout(timer);
        // Mark as down so next call skips immediately
        if (err.name === 'AbortError' || err.message.includes('fetch')) {
            providerStatus.kaggle.available = false;
            providerStatus.kaggle.lastCheck = Date.now();
        }
        logger.warn(`Kaggle ${endpoint}: ${err.message}`);
        return null;
    }
}

/**
 * Call local Ollama (only if provider is up)
 */
async function callOllama(model, prompt, options = {}) {
    const isUp = await probeProvider('ollama');
    if (!isUp) return null;

    try {
        const aiService = require('./aiService');
        const result = await aiService.generateText(model, prompt, options);
        return result?.text ? result : null;
    } catch {
        return null;
    }
}

// ─── Public API ─────────────────────────────────────────

async function reasoning(prompt, options = {}) {
    const order = getProviderOrder(options.providerPreference);
    for (const provider of order) {
        if (provider === 'kimi') {
            const kimi = await kimiService.generateText(prompt, {
                systemPrompt: options.systemPrompt,
                maxTokens: options.maxTokens,
                temperature: options.temperature,
            });
            if (kimi?.text) return { ...kimi, source: 'kimi-k2.5' };
        }

        if (provider === 'kaggle') {
            const kaggle = await callKaggle('/api/reasoning', {
                prompt,
                system_prompt: options.systemPrompt,
                max_tokens: options.maxTokens,
                temperature: options.temperature,
            });
            if (kaggle?.text) return { ...kaggle, source: 'kaggle' };
        }

        if (provider === 'ollama') {
            const ollama = await callOllama(options.modelPreference || 'planning', prompt, options);
            if (ollama?.text) return { ...ollama, source: 'ollama' };
        }
    }

    return { text: null, source: 'none' };
}

async function vision(imageBase64, prompt = 'Extract all text from this document.', options = {}) {
    const order = getProviderOrder(options.providerPreference);

    for (const provider of order) {
        if (provider === 'kimi') {
            const kimi = await kimiService.generateVisionJSON(imageBase64, prompt, {
                mimeType: options.mimeType || 'image/jpeg',
                maxTokens: options.maxTokens,
                temperature: options.temperature,
            });

            if (kimi?.parsed) {
                return {
                    ...kimi,
                    text: JSON.stringify(kimi.parsed),
                    source: 'kimi-k2.5',
                };
            }
            if (kimi?.text) return { ...kimi, source: 'kimi-k2.5' };
        }

        if (provider === 'kaggle') {
            const kaggle = await callKaggle('/api/vision', { image: imageBase64, prompt });
            if (kaggle?.text) return { ...kaggle, source: 'kaggle' };
        }
    }

    return { text: null, source: 'none' };
}

async function intent(prompt, systemPrompt, options = {}) {
    const order = getProviderOrder(options.providerPreference);

    for (const provider of order) {
        if (provider === 'kimi') {
            const kimi = await kimiService.generateJSON(prompt, {
                systemPrompt,
                temperature: 0.1,
                maxTokens: 512,
            });
            if (kimi?.parsed) return { ...kimi, source: 'kimi-k2.5' };
        }

        if (provider === 'kaggle') {
            const kaggle = await callKaggle('/api/intent', { prompt, system_prompt: systemPrompt });
            if (kaggle?.parsed) return { ...kaggle, source: 'kaggle' };
        }

        if (provider === 'ollama' && await probeProvider('ollama')) {
            try {
                const aiService = require('./aiService');
                const result = await aiService.generateJSON(options.modelPreference || 'intent', prompt, {
                    systemPrompt,
                    temperature: 0.1,
                });
                if (result?.parsed) return { ...result, source: 'ollama' };
            } catch { }
        }
    }

    // Fallback — orchestrator handles classification itself
    return { parsed: null, text: null, source: 'fallback' };
}

async function chat(prompt, options = {}) {
    const order = getProviderOrder(options.providerPreference);

    for (const provider of order) {
        if (provider === 'kimi') {
            const kimi = await kimiService.generateText(prompt, {
                systemPrompt: options.systemPrompt || 'You are OpsPilot, an AI assistant for CoreOps ERP.',
                maxTokens: options.maxTokens,
                temperature: options.temperature,
            });
            if (kimi?.text) return { ...kimi, source: 'kimi-k2.5' };
        }

        if (provider === 'kaggle') {
            const kaggle = await callKaggle('/api/chat', {
                prompt,
                system_prompt: options.systemPrompt || 'You are OpsPilot, an AI assistant for CoreOps ERP.',
                max_tokens: options.maxTokens,
                temperature: options.temperature,
            });
            if (kaggle?.text) return { ...kaggle, source: 'kaggle' };
        }

        if (provider === 'ollama') {
            const ollama = await callOllama(options.modelPreference || 'intent', prompt, options);
            if (ollama?.text) return { ...ollama, source: 'ollama' };
        }
    }

    return { text: null, source: 'none' };
}

async function search(query, summarize = true) {
    const kaggle = await callKaggle('/api/search', { query, summarize });
    if (kaggle) return { ...kaggle, source: 'kaggle' };
    return { results: [], source: 'none' };
}

async function healthCheck() {
    // Force fresh check
    providerStatus.kaggle.lastCheck = 0;
    providerStatus.ollama.lastCheck = 0;

    const [kimiHealth, kaggleUp, ollamaUp] = await Promise.all([
        kimiService.healthCheck(),
        probeProvider('kaggle'),
        probeProvider('ollama'),
    ]);

    let kaggleInfo = { available: kaggleUp };
    if (kaggleUp) {
        try {
            const res = await fetch(`${KAGGLE_URL}/api/health`, {
                headers: { 'ngrok-skip-browser-warning': 'true' },
                signal: AbortSignal.timeout(3000)
            });
            kaggleInfo = await res.json();
            kaggleInfo.available = true;
        } catch { }
    }

    return {
        'kimi-k2.5': kimiHealth,
        kaggle: kaggleInfo,
        ollama: { available: ollamaUp },
    };
}

module.exports = { reasoning, vision, intent, chat, search, healthCheck, callKaggle };
