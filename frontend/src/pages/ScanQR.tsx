import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ArrowLeft, Loader2, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

export function ScanQR() {
    const navigate = useNavigate();
    const [scanning, setScanning] = useState(true);
    const [scannedData, setScannedData] = useState<string | null>(null);

    // Simulate scanning process
    useEffect(() => {
        const timer = setTimeout(() => {
            setScanning(false);
        }, 2000); // Simulate camera init delay
        return () => clearTimeout(timer);
    }, []);

    const handleSimulateScan = () => {
        setScanning(true);
        setTimeout(() => {
            const mockAssetId = 'asset-123'; // In real app, this comes from QR
            setScannedData(mockAssetId);
            setScanning(false);
            // Navigate to asset or maintenance creation
            // specific logic could go here
            setTimeout(() => {
                navigate(`/assets?highlight=${mockAssetId}`);
            }, 1000);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-black p-4 flex flex-col items-center justify-center relative">
            <button
                onClick={() => navigate(-1)}
                className="absolute top-4 left-4 p-2 bg-white/10 rounded-full text-white"
            >
                <ArrowLeft className="w-6 h-6" />
            </button>

            <div className="w-full max-w-sm aspect-[3/4] bg-zinc-900 rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl">
                {/* Camera Viewfinder Simulation */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    {scanning ? (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-12 h-12 text-[var(--primary)] animate-spin" />
                            <p className="text-white font-medium animate-pulse">Initializing Camera...</p>
                        </div>
                    ) : (
                        <div className="text-center space-y-6 p-6">
                            <div className="w-64 h-64 border-2 border-[var(--primary)] rounded-lg relative mx-auto">
                                <div className="absolute inset-0 bg-[var(--primary)]/10 animate-pulse" />
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[var(--primary)] -mt-1 -ml-1" />
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[var(--primary)] -mt-1 -mr-1" />
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[var(--primary)] -mb-1 -ml-1" />
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[var(--primary)] -mb-1 -mr-1" />
                            </div>

                            <div>
                                <h2 className="text-xl font-bold text-white mb-2">Scan Asset QR</h2>
                                <p className="text-zinc-400 text-sm">Align the QR code within the frame to scan.</p>
                            </div>

                            <button
                                onClick={handleSimulateScan}
                                className="w-full py-4 bg-[var(--primary)] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                            >
                                <Camera className="w-5 h-5" />
                                Simulate Scan
                            </button>
                        </div>
                    )}
                </div>

                {scannedData && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        className="absolute bottom-0 left-0 right-0 bg-white p-6 rounded-t-3xl text-black"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                <QrCode className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Asset Found!</h3>
                                <p className="text-sm text-zinc-600">ID: {scannedData}</p>
                            </div>
                        </div>
                        <p className="text-xs text-zinc-500 text-center">Redirecting to details...</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
