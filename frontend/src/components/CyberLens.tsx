import { motion } from 'framer-motion';

interface CyberLensProps {
    isTyping: boolean;
    isFocused: boolean;
    isPeeking?: boolean; // New prop for show password
    state: 'idle' | 'success' | 'error';
}

export function CyberLens({ isTyping, isFocused, isPeeking, state }: CyberLensProps) {

    const getColor = () => {
        if (state === 'error') return '#ef4444'; // Red
        if (state === 'success') return '#22c55e'; // Green
        if (isPeeking) return '#eab308'; // Amber/Yellow (Peeking)
        if (isTyping) return '#3b82f6'; // Blue (Processing)
        if (isFocused) return '#6DFF8E'; // Neon Green (Active)
        return '#475569'; // Slate (Idle)
    };

    const color = getColor();

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* Outer Rotating Ring (Slow) */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute w-48 h-48 border border-slate-800/50 rounded-full flex items-center justify-center"
            >
                <div className="absolute top-0 w-1 h-3 bg-slate-800/50" />
                <div className="absolute bottom-0 w-1 h-3 bg-slate-800/50" />
                <div className="absolute left-0 w-3 h-1 bg-slate-800/50" />
                <div className="absolute right-0 w-3 h-1 bg-slate-800/50" />
            </motion.div>

            {/* Middle Data Ring (Counter-Rotate) */}
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute w-40 h-40 border border-dashed border-slate-700/30 rounded-full"
            />

            {/* Active Focus Ring (Reacts to State) */}
            <motion.div
                animate={{
                    scale: isFocused ? 1.1 : 1,
                    borderColor: color,
                    boxShadow: isFocused ? `0 0 30px ${color}40` : 'none'
                }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="absolute w-32 h-32 rounded-full border border-slate-800 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm"
                style={{ borderColor: isFocused ? color : 'rgba(30,41,59,0.5)' }}
            >
                {/* Inner Lens Iris */}
                <motion.div
                    animate={{
                        scale: isTyping ? [1, 0.9, 1] : (isPeeking ? 1.2 : 1), // Dilate when peeking
                        rotate: isPeeking ? 90 : 0 // Rotate when showing password
                    }}
                    transition={{
                        scale: { repeat: isTyping ? Infinity : 0, duration: 0.2 },
                        rotate: { type: "spring", stiffness: 200 }
                    }}
                    className="relative w-16 h-16"
                >
                    {/* SVG HUD Elements */}
                    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                        {/* Brackets */}
                        <motion.path
                            d="M 20 20 L 10 20 L 10 40"
                            fill="none"
                            stroke={color}
                            strokeWidth="2"
                            animate={{ d: isFocused ? "M 20 20 L 10 20 L 10 40" : "M 30 30 L 25 30 L 25 40" }}
                        />
                        <motion.path
                            d="M 80 20 L 90 20 L 90 40"
                            fill="none"
                            stroke={color}
                            strokeWidth="2"
                            animate={{ d: isFocused ? "M 80 20 L 90 20 L 90 40" : "M 70 30 L 75 30 L 75 40" }}
                            className="transition-all duration-300"
                        />
                        <motion.path
                            d="M 20 80 L 10 80 L 10 60"
                            fill="none"
                            stroke={color}
                            strokeWidth="2"
                            animate={{ d: isFocused ? "M 20 80 L 10 80 L 10 60" : "M 30 70 L 25 70 L 25 60" }}
                        />
                        <motion.path
                            d="M 80 80 L 90 80 L 90 60"
                            fill="none"
                            stroke={color}
                            strokeWidth="2"
                            animate={{ d: isFocused ? "M 80 80 L 90 80 L 90 60" : "M 70 70 L 75 70 L 75 60" }}
                        />

                        {/* Center Dot */}
                        <circle cx="50" cy="50" r={isTyping ? 4 : 2} fill={color} className="transition-all duration-300 blur-[1px]" />
                        <circle cx="50" cy="50" r={isTyping ? 2 : 1} fill="white" />
                    </svg>
                </motion.div>
            </motion.div>

            {/* Scanning Line (Only when typing) */}
            {isTyping && (
                <motion.div
                    initial={{ top: "20%", opacity: 0 }}
                    animate={{ top: "80%", opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute w-32 h-[1px] bg-blue-400 blur-[2px]"
                />
            )}
        </div>
    );
}
