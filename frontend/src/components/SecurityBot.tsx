import { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface SecurityBotProps {
    emailLength?: number;
    isPasswordFocused: boolean;
    showPassword: boolean;
}

export function SecurityBot({ emailLength = 0, isPasswordFocused, showPassword }: SecurityBotProps) {
    const pupilControls = useAnimation();
    const glowControls = useAnimation();
    const apertureControls = useAnimation();

    // Eye Tracking Logic
    useEffect(() => {
        if (isPasswordFocused) {
            // Recenter when focusing password (privacy mode)
            pupilControls.start({
                x: 0,
                y: 0,
                scale: 0.8, // Dilate slightly
                transition: { type: 'spring', stiffness: 200, damping: 20 }
            });
            return;
        }

        // Calculate Eye Position based on input length
        // We'll map the first 30 characters to a wide range (-25px to +25px)
        const maxChars = 30;
        const progress = Math.min(emailLength, maxChars) / maxChars; // 0 to 1
        const xOffset = (progress - 0.5) * 50; // Increased range to +/- 25px

        // Add slight random vertical jitter for "alive" robotic feel
        const yJitter = Math.sin(Date.now() / 500) * 2;

        pupilControls.start({
            x: xOffset,
            y: yJitter,
            scale: 1, // Normal pupil size
            transition: { type: 'spring', stiffness: 150, damping: 18, mass: 0.8 }
        });

    }, [emailLength, isPasswordFocused, pupilControls]);

    // Privacy / Shutter Logic
    useEffect(() => {
        if (isPasswordFocused && !showPassword) {
            // Privacy ON (Red)
            apertureControls.start({ rotate: -45, scale: 0.8 }); // Close aperture
            glowControls.start({
                boxShadow: "0 0 30px 5px rgba(239, 68, 68, 0.6)",
                borderColor: "#ef4444",
                backgroundColor: "rgba(239, 68, 68, 0.1)"
            });
        } else if (showPassword && isPasswordFocused) {
            // Peeking (Yellow/Orange)
            apertureControls.start({ rotate: -20, scale: 1 }); // Half open
            glowControls.start({
                boxShadow: "0 0 30px 5px rgba(234, 179, 8, 0.5)",
                borderColor: "#eab308",
                backgroundColor: "rgba(234, 179, 8, 0.1)"
            });
        } else {
            // Normal (Green)
            apertureControls.start({ rotate: 0, scale: 1 }); // Fully Open shutter
            glowControls.start({
                boxShadow: "0 0 30px 5px rgba(16, 185, 129, 0.5)",
                borderColor: "#10b981",
                backgroundColor: "rgba(16, 185, 129, 0.05)"
            });
        }
    }, [isPasswordFocused, showPassword, apertureControls, glowControls]);

    return (
        <div className="w-full h-full flex items-center justify-center relative group">

            {/* Holographic Container Effect */}
            <div className="absolute w-40 h-40 rounded-full bg-zinc-900/40 backdrop-blur-sm border border-white/5 flex items-center justify-center shadow-2xl overflow-hidden">
                {/* Scanning Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(16,185,129,0.05)_50%)] bg-[length:100%_4px] animate-scan" />

                {/* Rotating Rings */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                    className="absolute w-36 h-36 rounded-full border border-dashed border-white/10"
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                    className="absolute w-32 h-32 rounded-full border border-dotted border-white/10 opacity-50"
                />

                {/* MAIN EYE BALL */}
                <motion.div
                    animate={glowControls}
                    initial={{ boxShadow: "0 0 30px 5px rgba(16, 185, 129, 0.5)", borderColor: "#10b981" }}
                    className="w-24 h-24 bg-zinc-950 rounded-full border-2 relative overflow-hidden flex items-center justify-center shadow-inner"
                >
                    {/* Aperture Blades (Decorative mechanical eyelids) */}
                    <motion.div animate={apertureControls} className="absolute inset-0 z-20 pointer-events-none">
                        {/* Top Blade */}
                        <div className="absolute top-0 left-0 w-full h-1/2 bg-zinc-900 border-b border-zinc-800 origin-bottom transform -translate-y-[10%] group-hover:-translate-y-[12%] transition-transform" />
                        {/* Bottom Blade */}
                        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-zinc-900 border-t border-zinc-800 origin-top transform translate-y-[10%] group-hover:translate-y-[12%] transition-transform" />
                    </motion.div>

                    {/* The Pupil (Scanner) */}
                    <motion.div
                        animate={pupilControls}
                        className="w-10 h-10 bg-zinc-900 rounded-full border-[3px] border-[var(--primary)] shadow-[0_0_20px_rgba(16,185,129,0.8)] relative z-10 flex items-center justify-center"
                        style={{ borderColor: "inherit" }} // Inherit color from parent glow controls manually if simpler, or just use css var
                    >
                        {/* Inner Lens - The actual glowing dot */}
                        <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white]" />

                        {/* Radar Scan Effect inside pupil */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent to-white/20 animate-spin-slow" />
                    </motion.div>

                    {/* Grid Overlay inside Eye */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)] z-10" />
                </motion.div>
            </div>

            {/* Connecting Wire (Decoration) */}
            <div className="absolute -bottom-10 w-[1px] h-10 bg-gradient-to-b from-zinc-700 to-transparent opacity-50" />
        </div>
    );
}
