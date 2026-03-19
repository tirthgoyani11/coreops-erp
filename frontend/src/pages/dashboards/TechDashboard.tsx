import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    Bell,
    CheckCircle2,
    Clock,
    Loader2,
    MapPin,
    Mic,
    MicOff,
    QrCode,
    ScanLine,
    Wrench,
    Wifi,
    WifiOff,
} from 'lucide-react';
import api, { getErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

type WorkOrderStatus = 'REQUESTED' | 'PENDING' | 'IN_PROGRESS' | 'PENDING_PARTS' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';

interface WorkOrder {
    id: string;
    ticketNumber: string;
    status: WorkOrderStatus;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    issueDescription: string;
    issueType: string;
    createdAt: string;
    asset?: {
        id: string;
        name: string;
        guai?: string;
        status?: string;
        building?: string;
        floor?: string;
        room?: string;
        installationDate?: string;
        warrantyEnd?: string;
    };
}

interface TechnicianDashboardResponse {
    assignedOpen: number;
    completedToday: number;
    pendingAssignments: number;
    unreadNotifications: number;
    recentWorkOrders: WorkOrder[];
    workOrderOptions?: WorkOrder[];
}

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

interface QueueItem {
    type: 'worklog' | 'status';
    payload: Record<string, any>;
    createdAt: string;
}

const OFFLINE_QUEUE_KEY = 'tech_offline_ops_queue_v1';

function loadQueue(): QueueItem[] {
    try {
        const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveQueue(items: QueueItem[]) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
}

function relativeTime(dateStr: string) {
    const dt = new Date(dateStr).getTime();
    const diff = Date.now() - dt;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export function TechDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncingQueue, setSyncingQueue] = useState(false);

    const [summary, setSummary] = useState<TechnicianDashboardResponse>({
        assignedOpen: 0,
        completedToday: 0,
        pendingAssignments: 0,
        unreadNotifications: 0,
        recentWorkOrders: [],
        workOrderOptions: [],
    });
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    const [scanCode, setScanCode] = useState('');
    const [scannedAsset, setScannedAsset] = useState<any>(null);

    const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
    const [worklogNotes, setWorklogNotes] = useState('');
    const [maintenanceType, setMaintenanceType] = useState('CORRECTIVE');
    const [timeSpentMinutes, setTimeSpentMinutes] = useState<number>(30);
    const [proofImages, setProofImages] = useState('');
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
    const recognitionRef = useRef<any>(null);

    const queueCount = useMemo(() => loadQueue().length, [syncingQueue, isOnline, busy]);

    const workOrders = useMemo(() => {
        const merged = [
            ...(summary.workOrderOptions || []),
            ...(summary.recentWorkOrders || []),
        ];
        const uniqueById = new Map<string, WorkOrder>();
        for (const w of merged) {
            if (w?.id) uniqueById.set(w.id, w);
        }
        return Array.from(uniqueById.values());
    }, [summary.workOrderOptions, summary.recentWorkOrders]);

    const fetchTechnicianModule = async () => {
        try {
            setError(null);
            const [dashboardRes, notifRes] = await Promise.all([
                api.get('/maintenance/technician/dashboard'),
                api.get('/notifications', { params: { limit: 8, unreadOnly: 'false' } }),
            ]);

            setSummary(dashboardRes.data?.data || {
                assignedOpen: 0,
                completedToday: 0,
                pendingAssignments: 0,
                unreadNotifications: 0,
                recentWorkOrders: [],
                workOrderOptions: [],
            });

            setNotifications(notifRes.data?.data || []);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const queueOperation = (entry: QueueItem) => {
        const existing = loadQueue();
        existing.push(entry);
        saveQueue(existing);
    };

    const syncOfflineQueue = async () => {
        if (!navigator.onLine) return;
        const queue = loadQueue();
        if (queue.length === 0) return;

        setSyncingQueue(true);
        const remaining: QueueItem[] = [];

        for (const item of queue) {
            try {
                if (item.type === 'worklog') {
                    await api.post(`/maintenance/${item.payload.ticketId}/worklog`, item.payload.body);
                } else if (item.type === 'status') {
                    await api.patch(`/maintenance/${item.payload.ticketId}/status`, item.payload.body);
                }
            } catch {
                remaining.push(item);
            }
        }

        saveQueue(remaining);
        setSyncingQueue(false);
        await fetchTechnicianModule();
    };

    useEffect(() => {
        fetchTechnicianModule();
        const interval = setInterval(fetchTechnicianModule, 45_000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const onOnline = () => {
            setIsOnline(true);
            syncOfflineQueue();
        };
        const onOffline = () => setIsOnline(false);

        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    useEffect(() => {
        if (!selectedWorkOrder && workOrders.length > 0) {
            setSelectedWorkOrder(workOrders[0]);
        }
    }, [workOrders, selectedWorkOrder]);

    useEffect(() => {
        return () => {
            try {
                recognitionRef.current?.stop?.();
            } catch {
                // ignore cleanup failures
            }
        };
    }, []);

    const toggleVoiceInput = () => {
        if (voiceEnabled && recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // ignore stop failures
            }
            setVoiceEnabled(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Voice input is not supported on this device/browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 1;

        setVoiceEnabled(true);
        setSuccess(null);

        recognition.onresult = (event: any) => {
            let finalText = '';
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalText += `${result[0]?.transcript || ''} `;
                }
            }
            const clean = finalText.trim();
            if (!clean) return;

            setVoiceTranscript((prev) => `${prev}${prev ? ' ' : ''}${clean}`.trim());
            setWorklogNotes((prev) => `${prev}${prev ? ' ' : ''}${clean}`.trim());
        };

        recognition.onerror = () => {
            setVoiceEnabled(false);
            setError('Voice recognition failed. Please retry or type notes manually.');
        };
        recognition.onend = () => setVoiceEnabled(false);

        recognitionRef.current = recognition;
        recognition.start();
    };

    const captureLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported on this device.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                });
            },
            (geoError) => setError(geoError.message),
            { enableHighAccuracy: true, timeout: 10_000 }
        );
    };

    const resolveScan = async () => {
        if (!scanCode.trim()) return;

        setBusy(true);
        setSuccess(null);
        try {
            const res = await api.get('/assets/lookup', { params: { code: scanCode.trim() } });
            setScannedAsset(res.data?.data?.asset || null);
        } catch (err) {
            setError(getErrorMessage(err));
            setScannedAsset(null);
        } finally {
            setBusy(false);
        }
    };

    const updateWorkOrderStatus = async (ticketId: string, body: Record<string, any>) => {
        setBusy(true);
        setSuccess(null);
        try {
            if (!navigator.onLine) {
                queueOperation({ type: 'status', payload: { ticketId, body }, createdAt: new Date().toISOString() });
                setSuccess('Status update queued offline and will sync automatically.');
                return;
            }
            await api.patch(`/maintenance/${ticketId}/status`, body);
            setSuccess('Work order status updated successfully.');
            await fetchTechnicianModule();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const submitWorklog = async () => {
        if (!selectedWorkOrder) {
            setError('Please select a work order before submitting a log.');
            return;
        }

        const trimmedNotes = worklogNotes.trim();
        if (!trimmedNotes) {
            setError('Please add maintenance notes or record a voice note before submitting.');
            return;
        }

        const body = {
            notes: trimmedNotes,
            maintenanceType,
            timeSpentMinutes,
            location,
            voiceText: voiceTranscript || null,
            attachments: proofImages
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
        };

        setBusy(true);
        setSuccess(null);
        try {
            if (!navigator.onLine) {
                queueOperation({
                    type: 'worklog',
                    payload: { ticketId: selectedWorkOrder.id, body },
                    createdAt: new Date().toISOString(),
                });
                setSuccess('Work log queued offline and will sync automatically.');
            } else {
                await api.post(`/maintenance/${selectedWorkOrder.id}/worklog`, body);
                setSuccess('Maintenance log submitted successfully.');
            }

            setWorklogNotes('');
            setVoiceTranscript('');
            setProofImages('');
            await fetchTechnicianModule();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Technician Field Ops</h1>
                    <p className="text-sm text-[var(--text-secondary)]">{user?.name}, manage scans, work orders, logs, and on-site updates.</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <button
                        onClick={syncOfflineQueue}
                        disabled={!isOnline || syncingQueue || queueCount === 0}
                        className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] disabled:opacity-50"
                    >
                        {syncingQueue ? 'Syncing...' : `Sync Queue (${queueCount})`}
                    </button>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${isOnline ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-400 border-amber-500/30 bg-amber-500/10'}`}>
                        {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm">
                    {success}
                </div>
            )}

            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-secondary)]">Assigned Open</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{summary.assignedOpen}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-secondary)]">Completed Today</p>
                    <p className="text-2xl font-bold text-emerald-400">{summary.completedToday}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-secondary)]">Pending Assignment</p>
                    <p className="text-2xl font-bold text-amber-400">{summary.pendingAssignments}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-secondary)]">Unread Alerts</p>
                    <p className="text-2xl font-bold text-blue-400">{summary.unreadNotifications}</p>
                </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2"><ScanLine className="w-4 h-4" /> Scan / Resolve Asset</h2>
                        <button onClick={() => navigate('/scan')} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-overlay)]">Open Camera</button>
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={scanCode}
                            onChange={(e) => setScanCode(e.target.value)}
                            placeholder="Paste QR, GUAI, Serial, or URL"
                            className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2 text-sm"
                        />
                        <button onClick={resolveScan} disabled={busy} className="px-3 py-2 rounded-xl bg-[var(--primary)] text-black font-semibold">
                            <QrCode className="w-4 h-4" />
                        </button>
                    </div>

                    {scannedAsset && (
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3 space-y-2 text-sm">
                            <p className="font-semibold text-[var(--text-primary)]">{scannedAsset.name}</p>
                            <p className="text-[var(--text-secondary)]">Asset ID: {scannedAsset.guai || scannedAsset.id}</p>
                            <p className="text-[var(--text-secondary)]">Status: {scannedAsset.status}</p>
                            <p className="text-[var(--text-secondary)]">Location: {[scannedAsset.building, scannedAsset.floor, scannedAsset.room].filter(Boolean).join(' / ') || 'N/A'}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                <button onClick={() => navigate(`/assets/${scannedAsset.id}`)} className="px-2 py-2 rounded-lg border border-[var(--border-color)] text-xs">History</button>
                                <button onClick={() => navigate('/maintenance')} className="px-2 py-2 rounded-lg border border-[var(--border-color)] text-xs">Log Maintenance</button>
                                <button onClick={() => navigate('/my-tickets')} className="px-2 py-2 rounded-lg border border-[var(--border-color)] text-xs">Report Issue</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="xl:col-span-7 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-[var(--text-primary)]">My Work Orders</h2>
                        <button onClick={() => navigate('/my-tickets')} className="text-xs px-2 py-1 rounded-lg border border-[var(--border-color)]">View All</button>
                    </div>

                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                        {workOrders.length === 0 ? (
                            <div className="text-sm text-[var(--text-secondary)] py-8 text-center">No active work orders.</div>
                        ) : (
                            workOrders.map((w) => (
                                <div key={w.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{w.ticketNumber}</p>
                                            <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{w.issueDescription}</p>
                                            <p className="text-xs text-[var(--text-secondary)] mt-1">{w.asset?.name || 'Unknown Asset'} · {relativeTime(w.createdAt)}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[10px] px-2 py-1 rounded-full border ${w.priority === 'CRITICAL' ? 'text-rose-300 bg-rose-500/10 border-rose-500/30' : w.priority === 'HIGH' ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' : 'text-zinc-300 bg-zinc-500/10 border-zinc-500/30'}`}>
                                                {w.priority}
                                            </span>
                                            <p className="text-xs mt-1 text-[var(--text-secondary)]">{w.status}</p>
                                        </div>
                                    </div>

                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                                        <button onClick={() => updateWorkOrderStatus(w.id, { action: 'ACCEPT' })} className="text-xs py-1.5 rounded-lg border border-[var(--border-color)]">Accept</button>
                                        <button onClick={() => updateWorkOrderStatus(w.id, { status: 'IN_PROGRESS' })} className="text-xs py-1.5 rounded-lg border border-[var(--border-color)]">Start</button>
                                        <button
                                            onClick={() => {
                                                setSelectedWorkOrder(w);
                                                setWorklogNotes(`Completed ${w.ticketNumber}.`);
                                            }}
                                            className="text-xs py-1.5 rounded-lg border border-[var(--border-color)]"
                                        >
                                            Add Log
                                        </button>
                                        <button onClick={() => updateWorkOrderStatus(w.id, { status: 'COMPLETED', completionNotes: 'Completed by technician' })} className="text-xs py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">Complete</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2"><Wrench className="w-4 h-4" /> Maintenance Log</h2>
                        <div className="text-xs text-[var(--text-secondary)]">{selectedWorkOrder ? selectedWorkOrder.ticketNumber : 'Select a work order'}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <select
                            value={selectedWorkOrder?.id || ''}
                            onChange={(e) => {
                                const selected = workOrders.find((w) => w.id === e.target.value) || null;
                                setSelectedWorkOrder(selected);
                            }}
                            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2 text-sm"
                        >
                            <option value="">Select work order</option>
                            {workOrders.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.ticketNumber} - {w.asset?.name || 'Unknown Asset'} ({w.status})
                                </option>
                            ))}
                        </select>

                        <select value={maintenanceType} onChange={(e) => setMaintenanceType(e.target.value)} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2 text-sm">
                            <option value="PREVENTIVE">Preventive</option>
                            <option value="CORRECTIVE">Corrective</option>
                            <option value="INSPECTION">Inspection</option>
                            <option value="REPLACEMENT">Replacement</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input type="number" min={1} value={timeSpentMinutes} onChange={(e) => setTimeSpentMinutes(Number(e.target.value || 0))} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2 text-sm" placeholder="Time spent (min)" />
                        <input value={proofImages} onChange={(e) => setProofImages(e.target.value)} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2 text-sm" placeholder="Proof image URLs (comma separated)" />
                    </div>

                    <textarea
                        value={worklogNotes}
                        onChange={(e) => setWorklogNotes(e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2 text-sm"
                        placeholder="Add maintenance notes, issue findings, parts used, and completion remarks..."
                    />

                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={captureLocation} className="px-3 py-2 rounded-lg border border-[var(--border-color)] text-xs inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> Capture Location</button>
                        <button onClick={toggleVoiceInput} className="px-3 py-2 rounded-lg border border-[var(--border-color)] text-xs inline-flex items-center gap-1">
                            {voiceEnabled ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                            {voiceEnabled ? 'Stop Voice' : 'Voice Note'}
                        </button>
                        <button
                            onClick={submitWorklog}
                            disabled={!selectedWorkOrder || busy}
                            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-black font-semibold text-sm disabled:opacity-50"
                        >
                            Submit Log
                        </button>

                        {location && (
                            <span className="text-xs text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 rounded-full">
                                GPS: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                            </span>
                        )}

                        {voiceTranscript && (
                            <span className="text-xs text-blue-300 border border-blue-500/30 bg-blue-500/10 px-2 py-1 rounded-full">
                                Voice captured
                            </span>
                        )}
                    </div>
                </div>

                <div className="xl:col-span-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2"><Bell className="w-4 h-4" /> Alerts</h2>
                        <button onClick={() => navigate('/notifications')} className="text-xs px-2 py-1 rounded-lg border border-[var(--border-color)]">All</button>
                    </div>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {notifications.length === 0 ? (
                            <div className="text-sm text-[var(--text-secondary)] py-6 text-center">No notifications.</div>
                        ) : (
                            notifications.map((n) => (
                                <div key={n.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                    <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1">{n.title}</p>
                                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-0.5">{n.message}</p>
                                    <p className="text-[10px] mt-1 text-[var(--text-secondary)]">{relativeTime(n.createdAt)}</p>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)] space-y-1">
                        <p className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Offline mode queues logs and status updates</p>
                        <p className="inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-400" /> GPS tagged logs improve on-site validation</p>
                        <p className="inline-flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400" /> Track time spent per maintenance task</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default TechDashboard;