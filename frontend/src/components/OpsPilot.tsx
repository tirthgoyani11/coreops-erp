import { useState, useRef, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User, Loader2, ChevronDown } from 'lucide-react';

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



// ─── Lightweight Markdown Renderer ──────────────────────────────

function renderInlineMarkdown(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;
    let key = 0;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
        parts.push(<strong key={key++} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
}

function MarkdownTable({ lines }: { lines: string[] }) {
    const rows = lines
        .filter(l => l.trim().startsWith('|'))
        .map(l => l.split('|').slice(1, -1).map(cell => cell.trim()))
        .filter(cells => cells.length > 0 && !cells.every(c => /^[-:]+$/.test(c)));
    if (rows.length < 1) return null;
    const header = rows[0];
    const body = rows.slice(1);
    return (
        <div style={{ overflowX: 'auto', margin: '8px 0', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', lineHeight: '1.5' }}>
                <thead>
                    <tr>
                        {header.map((cell, i) => (
                            <th key={i} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, background: 'rgba(16,185,129,0.12)', borderBottom: '1px solid rgba(16,185,129,0.25)', whiteSpace: 'nowrap', color: '#10b981', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {renderInlineMarkdown(cell)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {body.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                            {row.map((cell, j) => (
                                <td key={j} style={{ padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary)', fontSize: '12px' }}>
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
            if (trimmed.startsWith('|')) {
                const tableLines: string[] = [];
                while (i < lines.length && lines[i].trim().startsWith('|')) { tableLines.push(lines[i]); i++; }
                result.push(<MarkdownTable key={key++} lines={tableLines} />);
                continue;
            }
            if (trimmed === '') { result.push(<div key={key++} style={{ height: '5px' }} />); i++; continue; }
            if (/^[•\-]\s/.test(trimmed)) {
                const bulletText = trimmed.replace(/^[•\-]\s*/, '');
                result.push(
                    <div key={key++} style={{ display: 'flex', gap: '6px', padding: '2px 0', lineHeight: '1.6' }}>
                        <span style={{ flexShrink: 0, color: '#10b981', fontWeight: 700 }}>•</span>
                        <span>{renderInlineMarkdown(bulletText)}</span>
                    </div>
                );
                i++; continue;
            }
            result.push(<div key={key++} style={{ padding: '1px 0', lineHeight: '1.6' }}>{renderInlineMarkdown(trimmed)}</div>);
            i++;
        }
        return result;
    }, [content]);
    return <>{elements}</>;
}

function TypewriterMessage({ content, isNew }: { content: string; isNew: boolean }) {
    const [displayed, setDisplayed] = useState(isNew ? '' : content);
    useEffect(() => {
        if (!isNew) return;
        let i = 0;
        const interval = setInterval(() => {
            if (i < content.length) { setDisplayed(content.slice(0, i + 12)); i += 12; }
            else { clearInterval(interval); setDisplayed(content); }
        }, 10);
        return () => clearInterval(interval);
    }, [content, isNew]);
    return <MarkdownContent content={displayed} />;
}

const QUICK_ACTIONS = [
    { emoji: '⚡', label: 'Dashboard', prompt: 'Show me the dashboard summary' },
    { emoji: '📦', label: 'Inventory', prompt: 'List all inventory items' },
    { emoji: '📋', label: 'Pending POs', prompt: 'Show all pending purchase orders' },
    { emoji: '🔧', label: 'Open Tickets', prompt: 'List all open maintenance tickets' },
    { emoji: '💰', label: 'P&L', prompt: 'Show profit and loss report' },
    { emoji: '🖥️', label: 'Assets', prompt: 'List all assets' },
];

export function OpsPilot() {
    const [isOpen, setIsOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hi! I'm **OpsPilot AI** 👋\n\nI can help you manage your entire ERP — assets, inventory, purchase orders, maintenance, finance, and more.\n\n• Say **\"dashboard\"** for a quick overview\n• Say **\"list inventory\"** to check stock\n• Say **\"create ticket\"** to raise an issue\n\nWhat would you like to do?",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [typingMsgId, setTypingMsgId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (isLoading || lastMsg?.role === 'user') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length, isLoading]);

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
    }, [isOpen]);

    // Lock body scroll on mobile when open
    useEffect(() => {
        if (isOpen && window.innerWidth < 768) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const sendMessage = async (text?: string) => {
        const msgText = (text || input).trim();
        if (!msgText || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: msgText,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await api.post('/ai/chat', { message: msgText });
            const data = res.data.data;
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || 'Request processed.',
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
                content: `❌ ${err.response?.data?.message || 'Something went wrong. Please try again.'}`,
                timestamp: new Date(),
            };
            setTypingMsgId(errorMsg.id);
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const isMobile = () => window.innerWidth < 768;

    // Panel dimensions based on screen + fullscreen state
    const getPanelStyle = (): React.CSSProperties => {
        if (isMobile() || isFullScreen) {
            return {
                position: 'fixed',
                inset: 0,
                borderRadius: 0,
                zIndex: 9999,
                width: '100%',
                height: '100%',
                maxHeight: '100%',
            };
        }
        return {
            position: 'fixed',
            bottom: '80px',
            right: '16px',
            width: 'min(440px, calc(100vw - 32px))',
            height: 'min(640px, calc(100vh - 100px))',
            borderRadius: '20px',
            zIndex: 9999,
        };
    };

    const showQuickActions = messages.length <= 1;

    return (
        <>
            {/* Floating Trigger Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setIsOpen(true)}
                        id="opspilot-trigger"
                        style={{
                            position: 'fixed',
                            bottom: '20px',
                            right: '20px',
                            zIndex: 9998,
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            border: '2px solid rgba(16,185,129,0.6)',
                            background: 'white',
                            cursor: 'pointer',
                            boxShadow: '0 4px 24px rgba(16,185,129,0.4), 0 2px 8px rgba(0,0,0,0.3)',
                            overflow: 'hidden',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <img src="/opspilot-logo.png" alt="OpsPilot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop (mobile) */}
                        {isMobile() && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9998 }}
                                onClick={() => setIsOpen(false)}
                            />
                        )}

                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                            style={{
                                ...getPanelStyle(),
                                background: '#0f1117',
                                border: isMobile() || isFullScreen ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                            }}
                        >
                            {/* ── Header ── */}
                            <div style={{
                                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                padding: '14px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                flexShrink: 0,
                                borderBottom: '1px solid rgba(255,255,255,0.08)',
                            }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
                                    <img src="/opspilot-logo.png" alt="OpsPilot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: 'white', fontWeight: 700, fontSize: '15px', lineHeight: 1.2 }}>OpsPilot AI</div>
                                    <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                                        OpsPilot 1.0 • Live
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    {/* Minimize/restore for non-mobile */}
                                    {!isMobile() && (
                                        <button
                                            onClick={() => setIsFullScreen(f => !f)}
                                            style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title={isFullScreen ? 'Minimize' : 'Expand'}
                                        >
                                            <ChevronDown style={{ width: '14px', height: '14px', color: 'white', transform: isFullScreen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setIsOpen(false); setIsFullScreen(false); }}
                                        style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <X style={{ width: '15px', height: '15px', color: 'white' }} />
                                    </button>
                                </div>
                            </div>

                            {/* ── Messages ── */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 4px', display: 'flex', flexDirection: 'column', gap: '8px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent', WebkitOverflowScrolling: 'touch' }}>
                                {messages.map(msg => (
                                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '7px', alignItems: 'flex-end' }}>
                                        {msg.role === 'assistant' && (
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1.5px solid rgba(16,185,129,0.4)' }}>
                                                <img src="/opspilot-logo.png" alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        )}
                                        <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                            <div style={{
                                                padding: '10px 13px',
                                                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                background: msg.role === 'user'
                                                    ? 'linear-gradient(135deg, #059669, #047857)'
                                                    : 'rgba(255,255,255,0.05)',
                                                border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                                                color: 'var(--text-primary)',
                                                fontSize: '13.5px',
                                                lineHeight: '1.5',
                                            }}>
                                                {msg.role === 'assistant'
                                                    ? <TypewriterMessage content={msg.content} isNew={msg.id === typingMsgId} />
                                                    : <MarkdownContent content={msg.content} />
                                                }
                                            </div>



                                            {/* Action results */}
                                            {msg.actions && msg.actions.map((action, i) => (
                                                <div key={i} style={{ padding: '7px 11px', borderRadius: '10px', fontSize: '12px', background: action.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${action.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, color: action.success ? '#10b981' : '#ef4444' }}>
                                                    {action.success ? '✅' : '❌'} {action.message}
                                                </div>
                                            ))}
                                        </div>
                                        {msg.role === 'user' && (
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #059669, #047857)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User style={{ width: '14px', height: '14px', color: 'white' }} />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Loading indicator */}
                                {isLoading && (
                                    <div style={{ display: 'flex', gap: '7px', alignItems: 'flex-end' }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1.5px solid rgba(16,185,129,0.4)' }}>
                                            <img src="/opspilot-logo.png" alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ padding: '10px 14px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                {[0, 1, 2].map(i => (
                                                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* ── Quick Actions ── */}
                            <AnimatePresence>
                                {showQuickActions && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        style={{ padding: '8px 12px 4px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '6px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                                    >
                                        {QUICK_ACTIONS.map((action, i) => (
                                            <button
                                                key={i}
                                                onClick={() => sendMessage(action.prompt)}
                                                style={{
                                                    flexShrink: 0,
                                                    padding: '6px 12px',
                                                    borderRadius: '20px',
                                                    background: 'rgba(16,185,129,0.08)',
                                                    border: '1px solid rgba(16,185,129,0.2)',
                                                    color: '#10b981',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    whiteSpace: 'nowrap',
                                                    fontWeight: 500,
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                {action.emoji} {action.label}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ── Input Bar ── */}
                            <div style={{ padding: '10px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '8px 10px 8px 14px', transition: 'border-color 0.2s' }}
                                    onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)')}
                                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                                >
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ask anything..."
                                        disabled={isLoading}
                                        id="opspilot-input"
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                            lineHeight: '1.4',
                                            minWidth: 0,
                                        }}
                                    />
                                    <button
                                        onClick={() => sendMessage()}
                                        id="opspilot-send"
                                        disabled={!input.trim() || isLoading}
                                        style={{
                                            flexShrink: 0,
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: input.trim() && !isLoading
                                                ? 'linear-gradient(135deg, #059669, #047857)'
                                                : 'rgba(255,255,255,0.06)',
                                            cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            opacity: isLoading ? 0.5 : 1,
                                        }}
                                    >
                                        {isLoading
                                            ? <Loader2 style={{ width: '15px', height: '15px', color: '#10b981', animation: 'spin 1s linear infinite' }} />
                                            : <Send style={{ width: '15px', height: '15px', color: input.trim() ? 'white' : 'rgba(255,255,255,0.3)' }} />
                                        }
                                    </button>
                                </div>
                                <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
                                    OpsPilot 1.0 • Local AI
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Animations */}
            <style>{`
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                #opspilot-input::placeholder { color: rgba(255,255,255,0.25); }
            `}</style>
        </>
    );
}
