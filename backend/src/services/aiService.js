const logger = require('../utils/logger');

/**
 * AI Service — Model-Agnostic Ollama Wrapper
 * 
 * Abstracts all LLM interactions behind a clean interface.
 * Swap models by changing config, not code.
 * 
 * Models (Option B — Local Ollama):
 *   - qwen2.5:1.5b  → Validation (fast, <200ms)
 *   - qwen2.5:3b    → Intent extraction
 *   - deepseek-r1:1.5b → Planning & reasoning
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

const MODELS = {
    validation: process.env.AI_MODEL_VALIDATION || 'qwen2.5:1.5b',
    intent: process.env.AI_MODEL_INTENT || 'qwen2.5:3b',
    planning: process.env.AI_MODEL_PLANNING || 'deepseek-r1:1.5b',
    vision: process.env.AI_MODEL_VISION || 'qwen2.5-vl:3b',
};

/**
 * Generate text from Ollama
 * @param {string} model - Model name (or key from MODELS)
 * @param {string} prompt - The prompt
 * @param {Object} options - { temperature, maxTokens, systemPrompt, format }
 * @returns {Object} { text, model, durationMs, tokensGenerated }
 */
async function generateText(model, prompt, options = {}) {
    const resolvedModel = MODELS[model] || model;
    const startTime = Date.now();

    try {
        const body = {
            model: resolvedModel,
            prompt,
            stream: false,
            options: {
                temperature: options.temperature ?? 0.3,
                num_predict: options.maxTokens || 1024,
            },
        };

        if (options.systemPrompt) {
            body.system = options.systemPrompt;
        }
        if (options.format === 'json') {
            body.format = 'json';
        }

        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const durationMs = Date.now() - startTime;

        return {
            text: data.response,
            model: resolvedModel,
            durationMs,
            tokensGenerated: data.eval_count || 0,
            tokensPerSecond: data.eval_count ? Math.round(data.eval_count / (durationMs / 1000)) : 0,
        };
    } catch (error) {
        logger.error(`AI generateText failed (${resolvedModel}):`, error.message);
        return {
            text: null,
            model: resolvedModel,
            durationMs: Date.now() - startTime,
            error: error.message,
        };
    }
}

/**
 * Generate structured JSON output from Ollama
 * @param {string} model - Model key or name
 * @param {string} prompt - The prompt requesting JSON output
 * @param {Object} options - Additional options
 * @returns {Object} { parsed, raw, model, durationMs }
 */
async function generateJSON(model, prompt, options = {}) {
    const result = await generateText(model, prompt, { ...options, format: 'json' });

    if (result.error || !result.text) {
        return { parsed: null, raw: null, ...result };
    }

    try {
        const parsed = JSON.parse(result.text);
        return { parsed, raw: result.text, ...result };
    } catch (parseError) {
        // Try to extract JSON from response text
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                return { parsed, raw: result.text, ...result };
            } catch (e) {
                // Fall through
            }
        }
        logger.warn('AI JSON parse failed, returning raw text');
        return { parsed: null, raw: result.text, ...result };
    }
}

/**
 * Chat-style completion (for multi-turn or system-prompted interactions)
 * @param {string} model - Model key
 * @param {Array} messages - [{ role: 'system'|'user'|'assistant', content: string }]
 * @param {Object} options - { temperature, maxTokens, format }
 * @returns {Object} { text, model, durationMs }
 */
async function chat(model, messages, options = {}) {
    const resolvedModel = MODELS[model] || model;
    const startTime = Date.now();

    try {
        const body = {
            model: resolvedModel,
            messages,
            stream: false,
            options: {
                temperature: options.temperature ?? 0.3,
                num_predict: options.maxTokens || 1024,
            },
        };

        if (options.format === 'json') {
            body.format = 'json';
        }

        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`Ollama chat error ${response.status}`);
        }

        const data = await response.json();
        return {
            text: data.message?.content || '',
            model: resolvedModel,
            durationMs: Date.now() - startTime,
            tokensGenerated: data.eval_count || 0,
        };
    } catch (error) {
        logger.error(`AI chat failed (${resolvedModel}):`, error.message);
        return {
            text: null,
            model: resolvedModel,
            durationMs: Date.now() - startTime,
            error: error.message,
        };
    }
}

/**
 * Check if Ollama is running and models are available
 * @returns {Object} { available, models, error }
 */
async function healthCheck() {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        if (!response.ok) throw new Error(`Status ${response.status}`);

        const data = await response.json();
        const availableModels = (data.models || []).map(m => m.name);

        return {
            available: true,
            models: availableModels,
            configured: MODELS,
        };
    } catch (error) {
        return {
            available: false,
            models: [],
            configured: MODELS,
            error: error.message,
        };
    }
}

module.exports = {
    generateText,
    generateJSON,
    chat,
    healthCheck,
    MODELS,
    OLLAMA_BASE_URL,
};
