import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowLeft,
    Camera,
    CheckCircle2,
    Loader2,
    QrCode,
    RefreshCcw,
    Search,
} from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';

type ScannerState = 'idle' | 'starting' | 'scanning' | 'resolved' | 'unsupported' | 'error';

interface BarcodeDetectorCompat {
    detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
}

declare global {
    interface Window {
        BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorCompat;
    }
}

function parseQrCode(raw: string): string {
    const value = String(raw || '').trim();
    const decoded = (() => {
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    })();

    const uuidMatch = decoded.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch && uuidMatch[0]) return uuidMatch[0];

    const pathMatch = decoded.match(/\/assets\/([a-zA-Z0-9-]{10,})/i);
    if (pathMatch && pathMatch[1]) return pathMatch[1];
    return decoded;
}

export function ScanQR() {
    const navigate = useNavigate();

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectorRef = useRef<BarcodeDetectorCompat | null>(null);
    const timerRef = useRef<number | null>(null);

    const [state, setState] = useState<ScannerState>('idle');
    const [error, setError] = useState<string>('');
    const [rawCode, setRawCode] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [asset, setAsset] = useState<any | null>(null);
    const [resolving, setResolving] = useState(false);

    const stopScanner = () => {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const resolveCodeToAsset = async (code: string) => {
        const normalized = parseQrCode(code);
        setResolving(true);
        setError('');

        try {
            let resolvedAsset: any | null = null;

            try {
                const lookupRes = await api.get('/assets/lookup', { params: { code: normalized } });
                resolvedAsset = lookupRes.data?.data?.asset || null;
            } catch {
                // Fallback for environments where /assets/lookup is unavailable.
                const directRes = await api.get(`/assets/${normalized}`);
                resolvedAsset = directRes.data?.data || null;
            }

            if (!resolvedAsset) {
                throw new Error('Asset not found for scanned code.');
            }

            setAsset(resolvedAsset);
            setRawCode(code);
            setState('resolved');
            stopScanner();
        } catch (err) {
            setError(getErrorMessage(err));
            setState('error');
        } finally {
            setResolving(false);
        }
    };

    const startScanner = async () => {
        setError('');
        setAsset(null);
        setRawCode('');
        setState('starting');

        if (!window.BarcodeDetector) {
            setState('unsupported');
            setError('This device/browser does not support native QR scanning. Use manual code input below.');
            return;
        }

        try {
            detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setState('scanning');

            timerRef.current = window.setInterval(async () => {
                if (!videoRef.current || !detectorRef.current || resolving) return;
                if (videoRef.current.readyState < 2) return;

                try {
                    const detections = await detectorRef.current.detect(videoRef.current);
                    if (detections.length > 0 && detections[0].rawValue) {
                        await resolveCodeToAsset(detections[0].rawValue);
                    }
                } catch {
                    // Keep scanning on intermittent detection failures.
                }
            }, 350);
        } catch (err: any) {
            setError(err?.message || 'Unable to start camera scanner.');
            setState('error');
            stopScanner();
        }
    };

    useEffect(() => {
        startScanner();
        return () => stopScanner();
    }, []);

    const submitManual = async () => {
        if (!manualCode.trim()) return;
        await resolveCodeToAsset(manualCode.trim());
    };

    const statusLabel = (() => {
        if (state === 'starting') return 'Starting camera...';
        if (state === 'scanning') return 'Point camera at asset QR code';
        if (state === 'resolved') return 'Asset resolved successfully';
        if (state === 'unsupported') return 'Scanner unsupported on this device';
        if (state === 'error') return 'Scanner error';
        return 'Ready';
    })();

    return (
        <div className="min-h-screen bg-[var(--bg-background)] p-4 md:p-6">
            <div className="max-w-4xl mx-auto space-y-5">
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                    <button
                        onClick={startScanner}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Restart Scanner
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-7 rounded-2xl border border-[var(--border-color)] bg-black overflow-hidden relative min-h-[360px]">
                        <video ref={videoRef} className="w-full h-full object-cover min-h-[360px]" playsInline muted />

                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-56 h-56 border-2 border-[var(--primary)] rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                        </div>

                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs">
                            <span className="px-2 py-1 rounded-full bg-black/65 text-white inline-flex items-center gap-1">
                                {state === 'scanning' ? <Camera className="w-3 h-3" /> : <QrCode className="w-3 h-3" />}
                                {statusLabel}
                            </span>
                            {resolving && (
                                <span className="px-2 py-1 rounded-full bg-black/65 text-white inline-flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Resolving asset
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-3">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Manual / Fallback Lookup</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Paste scanned value, GUAI, serial number, or asset URL.
                        </p>

                        <div className="flex gap-2">
                            <input
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="IN-HQ-000123 or https://.../assets/{id}"
                                className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2 text-sm"
                            />
                            <button
                                onClick={submitManual}
                                disabled={resolving}
                                className="px-3 py-2 rounded-xl bg-[var(--primary)] text-black font-semibold"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex gap-2">
                                <AlertTriangle className="w-4 h-4 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {asset && (
                            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 space-y-2">
                                <div className="inline-flex items-center gap-2 text-emerald-300 text-sm font-semibold">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Asset Found
                                </div>
                                <p className="text-[var(--text-primary)] font-semibold">{asset.name}</p>
                                <p className="text-xs text-[var(--text-secondary)]">ID: {asset.guai || asset.id}</p>
                                <p className="text-xs text-[var(--text-secondary)]">Status: {asset.status}</p>
                                <p className="text-xs text-[var(--text-secondary)]">Scanned: {rawCode}</p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                    <button
                                        onClick={() => navigate(`/assets/${asset.id}`)}
                                        className="px-2 py-2 rounded-lg border border-[var(--border-color)] text-xs hover:bg-[var(--bg-overlay)]"
                                    >
                                        View History
                                    </button>
                                    <button
                                        onClick={() => navigate(`/maintenance?assetId=${asset.id}`)}
                                        className="px-2 py-2 rounded-lg border border-[var(--border-color)] text-xs hover:bg-[var(--bg-overlay)]"
                                    >
                                        Log Maintenance
                                    </button>
                                    <button
                                        onClick={() => navigate(`/maintenance?assetId=${asset.id}&mode=report`)}
                                        className="px-2 py-2 rounded-lg border border-[var(--border-color)] text-xs hover:bg-[var(--bg-overlay)]"
                                    >
                                        Report Issue
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ScanQR;