import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User, Loader2, ChevronDown, Mic, MicOff, Command, Paperclip } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    suggestions?: string[];
    actions?: { success: boolean; message: string }[];
    imageUrl?: string; // for invoice preview in chat
}

// ─── Markdown renderer ───────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let last = 0, match, key = 0;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > last) parts.push(text.slice(last, match.index));
        parts.push(<strong key={key++} style={{ fontWeight: 700 }}>{match[1]}</strong>);
        last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
}

function Table({ lines }: { lines: string[] }) {
    const rows = lines
        .filter(l => l.trim().startsWith('|'))
        .map(l => l.split('|').slice(1, -1).map(c => c.trim()))
        .filter(r => r.length > 0 && !r.every(c => /^[-:]+$/.test(c)));
    if (!rows.length) return null;
    return (
        <div style={{ overflowX: 'auto', margin: '8px 0', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr>{rows[0].map((c, i) => <th key={i} style={{ padding: '8px 10px', textAlign: 'left', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(16,185,129,0.2)' }}>{renderInline(c)}</th>)}</tr></thead>
                <tbody>{rows.slice(1).map((r, i) => <tr key={i} style={{ background: i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>{r.map((c, j) => <td key={j} style={{ padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-primary)', fontSize: '12px' }}>{renderInline(c)}</td>)}</tr>)}</tbody>
            </table>
        </div>
    );
}

function Markdown({ text }: { text: string }) {
    const lines = text.split('\n');
    const out: React.ReactNode[] = [];
    let i = 0, k = 0;
    while (i < lines.length) {
        const t = lines[i].trim();
        if (t.startsWith('|')) {
            const tbl: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) tbl.push(lines[i++]);
            out.push(<Table key={k++} lines={tbl} />);
            continue;
        }
        if (!t) { out.push(<div key={k++} style={{ height: '5px' }} />); i++; continue; }
        if (/^[•\-]\s/.test(t)) {
            out.push(<div key={k++} style={{ display: 'flex', gap: '7px', padding: '2px 0', lineHeight: '1.6' }}>
                <span style={{ color: '#10b981', fontWeight: 700, flexShrink: 0 }}>•</span>
                <span>{renderInline(t.replace(/^[•\-]\s*/, ''))}</span>
            </div>);
            i++; continue;
        }
        out.push(<div key={k++} style={{ padding: '1px 0', lineHeight: '1.6' }}>{renderInline(t)}</div>);
        i++;
    }
    return <>{out}</>;
}

// Typewriter that renders fast
function Typewriter({ text, active }: { text: string; active: boolean }) {
    const [shown, setShown] = useState(active ? '' : text);
    useEffect(() => {
        if (!active) return;
        let i = 0;
        const id = setInterval(() => {
            if (i < text.length) { setShown(text.slice(0, i + 16)); i += 16; }
            else { setShown(text); clearInterval(id); }
        }, 10);
        return () => clearInterval(id);
    }, [text, active]);
    return <Markdown text={shown} />;
}

// ─── Slash commands palette ──────────────────────────────────────
const SLASH_COMMANDS = [
    { cmd: '/dashboard', label: 'Dashboard summary', prompt: 'Show me the dashboard' },
    { cmd: '/inventory', label: 'Inventory levels', prompt: 'List all inventory items' },
    { cmd: '/tickets', label: 'Open tickets', prompt: 'List all open maintenance tickets' },
    { cmd: '/pos', label: 'Pending POs', prompt: 'Show all pending purchase orders' },
    { cmd: '/assets', label: 'All assets', prompt: 'List all assets' },
    { cmd: '/pl', label: 'Profit & Loss', prompt: 'Show profit and loss report' },
    { cmd: '/cashflow', label: 'Cash flow', prompt: 'Show cash flow report' },
    { cmd: '/vendors', label: 'Vendors list', prompt: 'List all vendors' },
    { cmd: '/analytics', label: 'Analytics overview', prompt: 'Show analytics overview' },
    { cmd: '/me', label: 'My profile', prompt: 'Who am I' },
    { cmd: '/lowstock', label: 'Low stock alert', prompt: 'Show low stock items' },
    { cmd: '/predict', label: 'Predict maintenance', prompt: 'Predict maintenance for my assets' },
    { cmd: '/briefing', label: 'Smart briefing', prompt: 'Give me a full ERP briefing with urgent items' },
];

// ─── Main Component ──────────────────────────────────────────────
export function OpsPilot() {
    const [isOpen, setIsOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [typingId, setTypingId] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [slashOpen, setSlashOpen] = useState(false);
    const [slashFilter, setSlashFilter] = useState('');
    const [scanningImage, setScanningImage] = useState(false);

    const endRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    // ── Persist chat in localStorage ──────────────────────────────
    useEffect(() => {
        try {
            const saved = localStorage.getItem('opspilot_chat');
            if (saved) {
                const parsed = JSON.parse(saved);
                setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
            } else {
                setMessages([{
                    id: 'welcome',
                    role: 'assistant',
                    content: "Hi! I'm **OpsPilot** 👋 Your AI-powered ERP assistant.\n\n• Type `/` to see all quick commands\n• 🎤 Tap the mic to speak your request\n• Ask me **anything** about your ERP data\n\nSay **\"give me a briefing\"** and I'll scan the whole system for urgent items right now!",
                    timestamp: new Date(),
                    suggestions: ['⚡ Give me a briefing', '📊 Dashboard', '🔧 Open tickets'],
                }]);
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            try { localStorage.setItem('opspilot_chat', JSON.stringify(messages.slice(-40))); } catch { }
        }
    }, [messages]);

    // Auto-scroll
    useEffect(() => {
        const last = messages[messages.length - 1];
        if (isLoading || last?.role === 'user') endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, isLoading]);

    // Focus on open
    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
    }, [isOpen]);

    // Body scroll lock on mobile
    useEffect(() => {
        const mobile = window.innerWidth < 768;
        if (isOpen && mobile) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Auto-briefing — fires ONCE per browser session (sessionStorage)
    useEffect(() => {
        const alreadyBriefed = sessionStorage.getItem('opspilot_briefed');
        if (isOpen && !alreadyBriefed && messages.length <= 1) {
            sessionStorage.setItem('opspilot_briefed', '1');
            setTimeout(() => sendMessage('Give me a smart ERP briefing — list all urgent items including critical tickets, pending POs, and low stock'), 800);
        }
    }, [isOpen]);

    // ── Voice input ──────────────────────────────────────────────
    const toggleVoice = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Voice input not supported in this browser. Try Chrome.');
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const rec = new SpeechRecognition();
        rec.lang = 'en-IN';
        rec.continuous = false;
        rec.interimResults = false;

        rec.onstart = () => setIsListening(true);
        rec.onend = () => setIsListening(false);
        rec.onerror = () => setIsListening(false);
        rec.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript;
            setInput(transcript);
            setTimeout(() => sendMessage(transcript), 300);
        };

        recognitionRef.current = rec;
        rec.start();
    }, [isListening]);

    // ── Invoice image scan in chat ────────────────────────────────
    const scanImageInChat = async (file: File) => {
        if (!file) return;
        const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

        // Show user message with image
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: `📎 Scanning invoice: **${file.name}**`,
            timestamp: new Date(),
            imageUrl: previewUrl ?? undefined,
        };
        setMessages(prev => [...prev, userMsg]);
        setScanningImage(true);
        setIsLoading(true);

        const form = new FormData();
        form.append('invoice', file);
        try {
            const res = await api.post('/ocr/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const d = res.data.data;
            const ext = d.extractedData;
            let msg = `🧾 **Invoice Scanned!**\n\n`;
            if (ext.vendorName) msg += `| Field | Value |\n|-------|-------|\n`;
            if (ext.vendorName) msg += `| **Vendor** | ${ext.vendorName} |\n`;
            if (ext.invoiceNumber) msg += `| **Invoice #** | ${ext.invoiceNumber} |\n`;
            if (ext.date) msg += `| **Date** | ${ext.date} |\n`;
            if (ext.totalAmount) msg += `| **Total** | ₹${Number(ext.totalAmount).toLocaleString('en-IN')} |\n`;
            if (ext.taxAmount) msg += `| **Tax** | ₹${Number(ext.taxAmount).toLocaleString('en-IN')} |\n`;
            if (ext.vendorGST) msg += `| **GST** | ${ext.vendorGST} |\n`;
            if (d.matchedVendor) msg += `\n✅ **Vendor matched:** ${d.matchedVendor.name}`;
            if (d.documentId) msg += `\n📁 **Saved to Documents** (ID: ${d.documentId.slice(0,8)}...)`;
            msg += `\n\n💡 Go to **Finance → Invoice Upload** to create a transaction from this invoice.`;

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: msg,
                timestamp: new Date(),
                suggestions: ['💰 Create expense transaction', '📄 View documents', '📊 Show P&L'],
            };
            setTypingId(aiMsg.id);
            setMessages(prev => [...prev, aiMsg]);
        } catch (err: any) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `❌ Invoice scan failed: ${err.response?.data?.message || 'Try again'}`,
                timestamp: new Date(),
            }]);
        } finally {
            setScanningImage(false);
            setIsLoading(false);
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
    };

    // ── Send message ─────────────────────────────────────────────
    const sendMessage = async (text?: string) => {
        const msg = (text ?? input).trim();
        if (!msg || isLoading) return;

        // Resolve slash command
        const cmd = SLASH_COMMANDS.find(c => msg.toLowerCase() === c.cmd);
        const finalMsg = cmd ? cmd.prompt : msg;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: cmd ? `${cmd.cmd} — ${cmd.label}` : msg,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSlashOpen(false);
        setIsLoading(true);

        try {
            const res = await api.post('/ai/chat', { message: finalMsg });
            const data = res.data.data;
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || 'Done.',
                timestamp: new Date(),
                suggestions: data.suggestions,
                actions: data.actions,
            };
            setTypingId(aiMsg.id);
            setMessages(prev => [...prev, aiMsg]);
        } catch (err: any) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `❌ ${err.response?.data?.message || 'Something went wrong. Please try again.'}`,
                timestamp: new Date(),
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // ── Input change handler (detects slash) ─────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInput(val);
        if (val.startsWith('/')) {
            setSlashFilter(val.slice(1).toLowerCase());
            setSlashOpen(true);
        } else {
            setSlashOpen(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { setSlashOpen(false); return; }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    // ── Clear chat ───────────────────────────────────────────────
    const clearChat = () => {
        setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: "Chat cleared! How can I help you? Type `/` for commands or just ask anything.",
            timestamp: new Date(),
            suggestions: ['⚡ Dashboard', '📦 Inventory', '🔧 Open tickets'],
        }]);
        localStorage.removeItem('opspilot_chat');
        setBriefingDone(true);
    };

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const panelStyle: React.CSSProperties = (isMobile || isFullScreen) ? {
        position: 'fixed', inset: 0, borderRadius: 0, zIndex: 9999, width: '100%', height: '100%',
    } : {
        position: 'fixed', bottom: '80px', right: '16px',
        width: 'min(460px, calc(100vw - 32px))',
        height: 'min(660px, calc(100vh - 100px))',
        borderRadius: '22px', zIndex: 9999,
    };

    const filteredCmds = SLASH_COMMANDS.filter(c =>
        c.cmd.includes(slashFilter) || c.label.toLowerCase().includes(slashFilter)
    );

    return (
        <>
            {/* ── Floating Button ── */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setIsOpen(true)}
                        id="opspilot-trigger"
                        style={{
                            position: 'fixed', bottom: '20px', right: '20px', zIndex: 9998,
                            width: '56px', height: '56px', borderRadius: '50%',
                            border: '2.5px solid rgba(16,185,129,0.7)', background: 'white',
                            cursor: 'pointer', padding: 0, overflow: 'hidden',
                            boxShadow: '0 4px 24px rgba(16,185,129,0.5), 0 2px 8px rgba(0,0,0,0.3)',
                        }}>
                        <img src="/opspilot-logo.png" alt="OpsPilot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ── Chat Panel ── */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop (mobile) */}
                        {isMobile && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setIsOpen(false)}
                                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9998 }} />
                        )}

                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
                            style={{
                                ...panelStyle,
                                background: '#0d1117',
                                border: (isMobile || isFullScreen) ? 'none' : '1px solid rgba(255,255,255,0.07)',
                                boxShadow: '0 32px 90px rgba(0,0,0,0.7)',
                                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                            }}>

                            {/* ── Header ── */}
                            <div style={{
                                background: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)',
                                padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '11px',
                                flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.25)', flexShrink: 0 }}>
                                    <img src="/opspilot-logo.png" alt="OpsPilot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>OpsPilot AI</div>
                                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', flexShrink: 0, animation: 'opsPulse 2s infinite' }} />
                                        OpsPilot 1.0 • Live
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    {/* Clear */}
                                    <button onClick={clearChat} title="Clear chat"
                                        style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        ✕
                                    </button>
                                    {/* Expand (desktop only) */}
                                    {!isMobile && (
                                        <button onClick={() => setIsFullScreen(f => !f)} title={isFullScreen ? 'Restore' : 'Expand'}
                                            style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ChevronDown style={{ width: '14px', height: '14px', color: 'white', transform: isFullScreen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                        </button>
                                    )}
                                    {/* Close */}
                                    <button onClick={() => { setIsOpen(false); setIsFullScreen(false); }}
                                        style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <X style={{ width: '14px', height: '14px', color: 'white' }} />
                                    </button>
                                </div>
                            </div>

                            {/* ── Messages ── */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px 6px', display: 'flex', flexDirection: 'column', gap: '10px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent', WebkitOverflowScrolling: 'touch' }}>
                                {messages.map(msg => (
                                    <div key={msg.id}>
                                        <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '7px', alignItems: 'flex-end' }}>
                                            {msg.role === 'assistant' && (
                                                <div style={{ width: '27px', height: '27px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1.5px solid rgba(16,185,129,0.35)' }}>
                                                    <img src="/opspilot-logo.png" alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            )}
                                            <div style={{ maxWidth: '84%', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                                {/* Image thumbnail in user bubble */}
                                                {msg.imageUrl && (
                                                    <img src={msg.imageUrl} alt="Invoice" style={{ maxWidth: '160px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', objectFit: 'cover', maxHeight: '100px' }} />
                                                )}
                                                <div style={{
                                                    padding: '10px 13px',
                                                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                                                    background: msg.role === 'user' ? 'linear-gradient(135deg,#059669,#047857)' : 'rgba(255,255,255,0.04)',
                                                    border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                                    color: 'var(--text-primary)', fontSize: '13.5px', lineHeight: 1.55,
                                                }}>
                                                    {msg.role === 'assistant'
                                                        ? <Typewriter text={msg.content} active={msg.id === typingId} />
                                                        : <Markdown text={msg.content} />
                                                    }
                                                </div>

                                                {/* Action results */}
                                                {msg.actions?.map((a, i) => (
                                                    <div key={i} style={{ padding: '6px 10px', borderRadius: '9px', fontSize: '12px', background: a.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${a.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, color: a.success ? '#10b981' : '#ef4444' }}>
                                                        {a.success ? '✅' : '❌'} {a.message}
                                                    </div>
                                                ))}

                                                {/* ── Smart Follow-up Suggestions ── */}
                                                {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '3px' }}>
                                                        {msg.suggestions.map((s, i) => (
                                                            <button key={i} onClick={() => sendMessage(s)}
                                                                style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11.5px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', color: '#34d399', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', fontWeight: 500 }}
                                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.15)')}
                                                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.07)')}>
                                                                {s}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {msg.role === 'user' && (
                                                <div style={{ width: '27px', height: '27px', borderRadius: '50%', background: 'linear-gradient(135deg,#059669,#047857)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User style={{ width: '13px', height: '13px', color: 'white' }} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Loading */}
                                {isLoading && (
                                    <div style={{ display: 'flex', gap: '7px', alignItems: 'flex-end' }}>
                                        <div style={{ width: '27px', height: '27px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid rgba(16,185,129,0.35)', flexShrink: 0 }}>
                                            <img src="/opspilot-logo.png" alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ padding: '11px 14px', borderRadius: '4px 18px 18px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                                {[0, 1, 2].map(i => (
                                                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: `opsBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={endRef} />
                            </div>

                            {/* ── Slash Command Palette ── */}
                            <AnimatePresence>
                                {slashOpen && filteredCmds.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                                        style={{ background: '#161b22', borderTop: '1px solid rgba(255,255,255,0.07)', maxHeight: '200px', overflowY: 'auto', flexShrink: 0 }}>
                                        <div style={{ padding: '6px 12px 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Command style={{ width: '11px', height: '11px', color: '#10b981' }} />
                                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Commands</span>
                                        </div>
                                        {filteredCmds.map(c => (
                                            <button key={c.cmd} onClick={() => { setInput(c.cmd); sendMessage(c.cmd); }}
                                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.08)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                                <code style={{ color: '#10b981', fontSize: '12px', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '2px 7px', borderRadius: '5px', minWidth: '80px' }}>{c.cmd}</code>
                                                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12.5px' }}>{c.label}</span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ── Input Bar ── */}
                            <div style={{ padding: '10px 12px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                                <div style={{ display: 'flex', gap: '7px', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '14px', padding: '7px 9px 7px 13px' }}>
                                    {/* Slash hint */}
                                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)', flexShrink: 0, userSelect: 'none' }}>/</span>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={handleInputChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ask anything or type / for commands..."
                                        disabled={isLoading}
                                        id="opspilot-input"
                                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.4, minWidth: 0 }}
                                    />
                                    {/* Image scan button */}
                                    <input ref={imageInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                                        onChange={e => e.target.files?.[0] && scanImageInChat(e.target.files[0])} />
                                    <button onClick={() => imageInputRef.current?.click()} title="Scan invoice image"
                                        style={{ width: '34px', height: '34px', borderRadius: '9px', border: 'none', background: scanningImage ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                                        <Paperclip style={{ width: '14px', height: '14px', color: scanningImage ? '#f59e0b' : 'rgba(255,255,255,0.35)', animation: scanningImage ? 'opsPulse 1s infinite' : 'none' }} />
                                    </button>
                                    {/* Voice button */}
                                    <button onClick={toggleVoice} title={isListening ? 'Stop listening' : 'Voice input'}
                                        style={{ width: '34px', height: '34px', borderRadius: '9px', border: 'none', background: isListening ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                                        {isListening
                                            ? <MicOff style={{ width: '15px', height: '15px', color: '#ef4444', animation: 'opsPulse 1s infinite' }} />
                                            : <Mic style={{ width: '15px', height: '15px', color: 'rgba(255,255,255,0.35)' }} />
                                        }
                                    </button>
                                    {/* Send button */}
                                    <button onClick={() => sendMessage()} id="opspilot-send"
                                        disabled={!input.trim() || isLoading}
                                        style={{ width: '34px', height: '34px', borderRadius: '9px', border: 'none', background: input.trim() && !isLoading ? 'linear-gradient(135deg,#059669,#047857)' : 'rgba(255,255,255,0.05)', cursor: input.trim() && !isLoading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                                        {isLoading
                                            ? <Loader2 style={{ width: '14px', height: '14px', color: '#10b981', animation: 'opsSpin 1s linear infinite' }} />
                                            : <Send style={{ width: '14px', height: '14px', color: input.trim() ? 'white' : 'rgba(255,255,255,0.2)', marginLeft: '1px' }} />
                                        }
                                    </button>
                                </div>
                                <div style={{ textAlign: 'center', marginTop: '7px', fontSize: '10px', color: 'rgba(255,255,255,0.18)' }}>
                                    OpsPilot 1.0 &nbsp;|&nbsp; 🎤 Voice &nbsp;|&nbsp; / Commands &nbsp;|&nbsp; 📎 Invoice Scan
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Global animations */}
            <style>{`
                @keyframes opsBounce {
                    0%,80%,100% { transform: scale(0.55); opacity: 0.35; }
                    40% { transform: scale(1); opacity: 1; }
                }
                @keyframes opsSpin {
                    to { transform: rotate(360deg); }
                }
                @keyframes opsPulse {
                    0%,100% { opacity: 1; }
                    50% { opacity: 0.35; }
                }
                #opspilot-input::placeholder { color: rgba(255,255,255,0.2); }
            `}</style>
        </>
    );
}
