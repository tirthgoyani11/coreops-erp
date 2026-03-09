/**
 * Kimi K2.5 Service — NVIDIA NIM API (OpenAI-compatible)
 * 
 * Primary LLM provider for CoreOps ERP.
 * Uses NVIDIA's hosted Kimi K2.5 Instruct model via NIM API.
 * Falls back to Kaggle/Ollama if unavailable.
 */

const logger = require('../utils/logger');

const NVIDIA_BASE_URL = process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const KIMI_MODEL = process.env.KIMI_MODEL || 'moonshotai/kimi-k2-instruct';
const KIMI_TIMEOUT = parseInt(process.env.KIMI_TIMEOUT || '30000', 10);

/**
 * Check if Kimi K2.5 is configured (API key present)
 */
function isConfigured() {
    return Boolean(NVIDIA_API_KEY);
}

/**
 * Call NVIDIA NIM chat completions endpoint
 * @param {Array} messages - [{ role: 'system'|'user'|'assistant', content: string }]
 * @param {Object} options - { temperature, maxTokens }
 * @returns {Object|null} { text, model, tokensGenerated } or null on failure
 */
async function callChatCompletions(messages, options = {}) {
    if (!isConfigured()) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), KIMI_TIMEOUT);

    try {
        const body = {
            model: KIMI_MODEL,
            messages,
            temperature: options.temperature ?? 0.6,
            max_tokens: options.maxTokens || 4096,
        };

        const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NVIDIA_API_KEY}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`NVIDIA API ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];

        if (!choice?.message?.content) {
            throw new Error('Empty response from Kimi K2.5');
        }

        return {
            text: choice.message.content.trim(),
            model: data.model || KIMI_MODEL,
            tokensGenerated: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
        };
    } catch (err) {
        clearTimeout(timer);
        const errMsg = err.name === 'AbortError' ? 'Kimi K2.5 request timed out' : err.message;
        logger.warn(`[KimiService] ${errMsg}`);
        return null;
    }
}

/**
 * Generate text with a prompt and optional system prompt
 */
async function generateText(prompt, options = {}) {
    const messages = [];
    if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    return callChatCompletions(messages, options);
}

/**
 * Generate structured JSON output
 */
async function generateJSON(prompt, options = {}) {
    const systemAddition = '\n\nIMPORTANT: Output ONLY valid JSON. No markdown, no explanation, just the JSON object.';
    const systemPrompt = (options.systemPrompt || '') + systemAddition;

    const result = await generateText(prompt, { ...options, systemPrompt });
    if (!result?.text) return null;

    // Parse JSON from response
    try {
        const parsed = JSON.parse(result.text);
        return { ...result, parsed };
    } catch {
        // Try to extract JSON from surrounding text
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                return { ...result, parsed };
            } catch {
                // Fall through
            }
        }
        logger.warn('[KimiService] JSON parse failed, returning raw text');
        return { ...result, parsed: null };
    }
}

/**
 * Health check — verify API key works
 */
async function healthCheck() {
    if (!isConfigured()) {
        return { available: false, reason: 'NVIDIA_API_KEY not set' };
    }

    try {
        const result = await generateText('Reply with: OK', {
            maxTokens: 10,
            temperature: 0,
        });
        return {
            available: Boolean(result?.text),
            model: KIMI_MODEL,
        };
    } catch (err) {
        return { available: false, reason: err.message };
    }
}

module.exports = {
    isConfigured,
    generateText,
    generateJSON,
    callChatCompletions,
    healthCheck,
};
