import { useState, useRef, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, X, Send, Brain, Eye, Search,
    User, Loader2, Zap, Sparkles
} from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    intent?: string;
    modelsUsed?: { model: string; source: string }[];
    actions?: { success: boolean; message: string }[];
    durationMs?: number;
}

const MODEL_ICONS: Record<string, { icon: typeof Brain; color: string; label: string }> = {
    reasoning: { icon: Brain, color: '#8b5cf6', label: 'DeepSeek-R1' },
    'intent-llm': { icon: Zap, color: '#f59e0b', label: 'Opus 1.0' },
    'local-classifier': { icon: Zap, color: '#22c55e', label: 'Local' },
    vision: { icon: Eye, color: '#3b82f6', label: 'Qwen2.5-VL' },
    intent: { icon: Zap, color: '#f59e0b', label: 'Opus 1.0' },
    chat: { icon: MessageSquare, color: '#10b981', label: 'Opus 1.0' },
    search: { icon: Search, color: '#ef4444', label: 'Web Search' },
};

// ─── Lightweight Markdown Renderer ──────────────────────────────

function renderInlineMarkdown(text: string): React.ReactNode[] {
    // Parse **bold** and the rest as text
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        parts.push(<strong key={key++} style={{ fontWeight: 600 }}>{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }
    return parts;
}

function MarkdownTable({ lines }: { lines: string[] }) {
    // Parse markdown table lines
    const rows = lines
        .filter(l => l.trim().startsWith('|'))
        .map(l =>
            l.split('|')
                .slice(1, -1)
                .map(cell => cell.trim())
        )
        .filter(cells => cells.length > 0 && !cells.every(c => /^[-:]+$/.test(c)));

    if (rows.length < 1) return null;

    const header = rows[0];
    const body = rows.slice(1);

    return (
        <div style={{
            overflowX: 'auto',
            margin: '8px 0',
            borderRadius: '8px',
            border: '1px solid rgba(128,128,128,0.2)',
        }}>
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
                lineHeight: '1.5',
            }}>
                <thead>
                    <tr>
                        {header.map((cell, i) => (
                            <th key={i} style={{
                                padding: '7px 10px',
                                textAlign: 'left',
                                fontWeight: 600,
                                background: 'rgba(128,128,128,0.12)',
                                borderBottom: '2px solid rgba(128,128,128,0.2)',
                                whiteSpace: 'nowrap',
                                color: 'var(--text-primary)',
                            }}>
                                {renderInlineMarkdown(cell)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {body.map((row, i) => (
                        <tr key={i} style={{
                            background: i % 2 === 0 ? 'transparent' : 'rgba(128,128,128,0.06)',
                        }}>
                            {row.map((cell, j) => (
                                <td key={j} style={{
                                    padding: '6px 10px',
                                    borderBottom: '1px solid rgba(128,128,128,0.12)',
                                    color: 'var(--text-primary)',
                                }}>
                                    {renderInlineMarkdown(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MarkdownContent({ content }: { content: string }) {
    const elements = useMemo(() => {
        const lines = content.split('\n');
        const result: React.ReactNode[] = [];
        let i = 0;
        let key = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();

            // Table block: collect consecutive | lines
            if (trimmed.startsWith('|')) {
                const tableLines: string[] = [];
                while (i < lines.length && lines[i].trim().startsWith('|')) {
                    tableLines.push(lines[i]);
                    i++;
                }
                result.push(<MarkdownTable key={key++} lines={tableLines} />);
                continue;
            }

            // Empty line → spacer
            if (trimmed === '') {
                result.push(<div key={key++} style={{ height: '6px' }} />);
                i++;
                continue;
            }

            // Bullet point (• or - at start)
            if (/^[•\-]\s/.test(trimmed)) {
                const bulletText = trimmed.replace(/^[•\-]\s*/, '');
                result.push(
                    <div key={key++} style={{
                        display: 'flex',
                        gap: '6px',
                        padding: '2px 0',
                        lineHeight: '1.55',
                    }}>
                        <span style={{ flexShrink: 0 }}>•</span>
                        <span>{renderInlineMarkdown(bulletText)}</span>
                    </div>
                );
                i++;
                continue;
            }

            // Regular line with inline markdown
            result.push(
                <div key={key++} style={{ padding: '1px 0', lineHeight: '1.55' }}>
                    {renderInlineMarkdown(trimmed)}
                </div>
            );
            i++;
        }

        return result;
    }, [content]);

    return <>{elements}</>;
}

function TypewriterMessage({ content, isNew }: { content: string, isNew: boolean }) {
    const [displayed, setDisplayed] = useState(isNew ? '' : content);

    useEffect(() => {
        if (!isNew) return;
        let i = 0;
        const interval = setInterval(() => {
            if (i < content.length) {
                // Type 8 characters at a time for a fast, readable stream effect
                const nextChunk = i + 8;
                setDisplayed(content.slice(0, nextChunk));
                i = nextChunk;
            } else {
                clearInterval(interval);
                setDisplayed(content);
            }
        }, 12);
        return () => clearInterval(interval);
    }, [content, isNew]);

    return <MarkdownContent content={displayed} />;
}

export function OpsPilot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hi! I'm **OpsPilot**, your AI assistant. I can analyze budgets, approve POs, detect anomalies, scan invoices, and more. Just ask!",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [thinkingModel, setThinkingModel] = useState('');
    const [typingMsgId, setTypingMsgId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Only auto-scroll to bottom when the USER sends a message or loading starts.
    // This prevents jumping past huge AI responses, allowing the user to read from the top!
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (isLoading || lastMsg?.role === 'user') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length, isLoading]);

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        setThinkingModel('Processing request...');

        try {
            const res = await api.post('/ai/chat', { message: userMsg.content });
            const data = res.data.data;

            setThinkingModel('');

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || 'I processed your request but have no response.',
                timestamp: new Date(),
                intent: data.intent,
                modelsUsed: data.modelsUsed,
                actions: data.actions,
                durationMs: data.durationMs,
            };

            setTypingMsgId(aiMsg.id);
            setMessages(prev => [...prev, aiMsg]);
        } catch (err: any) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Sorry, I couldn't process that. ${err.response?.data?.message || err.message || 'Please try again.'}`,
                timestamp: new Date(),
            };
            setTypingMsgId(errorMsg.id);
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
            setThinkingModel('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const quickActions = [
        "📊 Dashboard summary",
        "📦 List inventory",
        "📋 Pending POs",
        "🔧 Open tickets",
    ];

    return (
        <>
            {/* Floating Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-2 border-emerald-500 overflow-hidden bg-white"
                        style={{
                            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                        }}
                        id="opspilot-trigger"
                    >
                        <img src="/opspilot-logo.png" alt="OpsPilot" className="w-full h-full object-cover" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-6 right-6 z-50 flex flex-col"
                        style={{
                            width: '420px',
                            height: '600px',
                            maxHeight: 'calc(100vh - 48px)',
                            borderRadius: '20px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-primary)',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div
                            className="flex items-center justify-between px-5 py-4 shrink-0"
                            style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-sm overflow-hidden border border-white/20">
                                    <img src="/opspilot-logo.png" alt="OpsPilot" className="w-full h-full object-cover rounded-full" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-sm">OpsPilot AI</h3>
                                    <p className="text-white/70 text-xs">Multi-LLM Agent • Opus 1.0</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                                        {/* Avatar */}
                                        <div className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <div
                                                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'assistant' ? 'overflow-hidden shadow-sm shadow-emerald-900/10' : ''}`}
                                                style={{
                                                    background: msg.role === 'user'
                                                        ? 'var(--primary)'
                                                        : 'transparent',
                                                }}
                                            >
                                                {msg.role === 'user'
                                                    ? <User className="w-3.5 h-3.5 text-white" />
                                                    : <img src="/opspilot-logo.png" alt="OpsPilot" className="w-full h-full object-cover rounded-full" />
                                                }
                                            </div>

                                            <div>
                                                {/* Bubble */}
                                                <div
                                                    className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                                                    style={{
                                                        background: msg.role === 'user'
                                                            ? 'var(--primary)'
                                                            : 'var(--bg-secondary)',
                                                        color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                                                        borderBottomRightRadius: msg.role === 'user' ? '4px' : undefined,
                                                        borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : undefined,
                                                    }}
                                                >
                                                    {msg.role === 'assistant' ? (
                                                        <TypewriterMessage content={msg.content} isNew={msg.id === typingMsgId} />
                                                    ) : (
                                                        <MarkdownContent content={msg.content} />
                                                    )}
                                                </div>

                                                {/* Model chain badge */}
                                                {msg.modelsUsed && msg.modelsUsed.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {msg.modelsUsed.map((m, i) => {
                                                            const info = MODEL_ICONS[m.model] || MODEL_ICONS.chat;
                                                            const Icon = info.icon;
                                                            const sourceLabel = m.source === 'kimi-k2.5' ? 'Opus 1.0'
                                                                : m.source === 'kaggle' ? 'Kaggle GPU'
                                                                : m.source === 'ollama' ? info.label
                                                                : m.source === 'local' ? 'Local'
                                                                : info.label;
                                                            return (
                                                                <span
                                                                    key={i}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
                                                                    style={{
                                                                        background: `${info.color}15`,
                                                                        color: info.color,
                                                                        border: `1px solid ${info.color}30`,
                                                                    }}
                                                                >
                                                                    <Icon className="w-2.5 h-2.5" />
                                                                    {sourceLabel}
                                                                </span>
                                                            );
                                                        })}
                                                        {msg.durationMs && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full"
                                                                style={{ color: 'var(--text-muted)' }}>
                                                                {msg.durationMs}ms
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Action results */}
                                                {msg.actions && msg.actions.length > 0 && msg.actions.map((action, i) => (
                                                    <div key={i}
                                                        className="mt-2 px-3 py-2 rounded-lg text-xs"
                                                        style={{
                                                            background: action.success ? '#10b98115' : '#ef444415',
                                                            border: `1px solid ${action.success ? '#10b98130' : '#ef444430'}`,
                                                            color: action.success ? '#10b981' : '#ef4444',
                                                        }}>
                                                        {action.success ? '✅' : '❌'} {action.message}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Thinking indicator */}
                            {isLoading && (
                                <div className="flex items-start gap-2">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm shadow-emerald-900/10 bg-transparent">
                                        <img src="/opspilot-logo.png" alt="OpsPilot" className="w-full h-full object-cover rounded-full" />
                                    </div>
                                    <div className="px-3.5 py-2.5 rounded-2xl text-sm"
                                        style={{ background: 'var(--bg-secondary)', borderBottomLeftRadius: '4px' }}>
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#10b981' }} />
                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                {thinkingModel || 'Thinking...'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick actions */}
                        {messages.length <= 1 && (
                            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                                {quickActions.map((action, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setInput(action); }}
                                        className="px-3 py-1.5 rounded-full text-xs transition-colors"
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-secondary)',
                                            border: '1px solid var(--border-primary)',
                                        }}
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input */}
                        <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid var(--border-primary)' }}>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask OpsPilot anything..."
                                    disabled={isLoading}
                                    className="flex-1 bg-transparent outline-none text-sm"
                                    style={{ color: 'var(--text-primary)' }}
                                    id="opspilot-input"
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!input.trim() || isLoading}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                                    style={{
                                        background: input.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                                        opacity: input.trim() ? 1 : 0.3,
                                    }}
                                    id="opspilot-send"
                                >
                                    <Send className="w-4 h-4 text-white" />
                                </button>
                            </div>
                            <p className="text-center mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                Powered by Opus 1.0 • DeepSeek-R1 • Multi-LLM Orchestrator
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
