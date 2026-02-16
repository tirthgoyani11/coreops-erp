import { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface SecurityBotProps {
    emailLength?: number;
    isPasswordFocused: boolean;
    showPassword: boolean;
    isScanning?: boolean; // New prop for typing activity
}

export function SecurityBot({ emailLength = 0, isPasswordFocused, showPassword, isScanning = false }: SecurityBotProps) {
    const pupilControls = useAnimation();
    const glowControls = useAnimation();
    const apertureControls = useAnimation();

    // Blinking State
    const [isBlinking, setIsBlinking] = useState(false);

    // Random Blinking Logic
    useEffect(() => {
        const blinkLoop = () => {
            const delay = Math.random() * 3000 + 2000; // Random delay between 2-5s
            setTimeout(() => {
                setIsBlinking(true);
                setTimeout(() => setIsBlinking(false), 150); // Blink duration
                blinkLoop();
            }, delay);
        };
        blinkLoop();
        return () => { }; // Cleanup not strictly necessary for simple timeout loop in this context
    }, []);

    // Eye Tracking & scanning Logic
    useEffect(() => {
        if (isPasswordFocused) {
            // Recenter when focusing password (privacy mode)
            pupilControls.start({
                x: 0,
                y: 0,
                scale: 0.8,
                transition: { type: 'spring', stiffness: 200, damping: 20 }
            });
            return;
        }

        if (isScanning) {
            // Rapid scanning jitter
            pupilControls.start({
                x: [0, -5, 5, -5, 5, 0],
                transition: { duration: 0.2, repeat: 1 }
            });
        } else {
            // Normal Tracking
            const maxChars = 30;
            const progress = Math.min(emailLength, maxChars) / maxChars;
            const xOffset = (progress - 0.5) * 40;
            const yJitter = Math.sin(Date.now() / 1000) * 2;

            pupilControls.start({
                x: xOffset,
                y: yJitter,
                scale: 1,
                transition: { type: 'spring', stiffness: 120, damping: 20 }
            });
        }

    }, [emailLength, isPasswordFocused, isScanning, pupilControls]);

    // Privacy / Shutter Logic (Color States)
    useEffect(() => {
        if (isPasswordFocused && !showPassword) {
            // Privacy ON (Red)
            apertureControls.start({ rotate: -45, scale: 0.8 });
            glowControls.start({
                boxShadow: "0 0 40px 10px rgba(239, 68, 68, 0.5)",
                borderColor: "#ef4444",
                backgroundColor: "rgba(239, 68, 68, 0.1)"
            });
        } else if (showPassword && isPasswordFocused) {
            // Peeking (Yellow/Orange)
            apertureControls.start({ rotate: -20, scale: 1 });
            glowControls.start({
                boxShadow: "0 0 40px 10px rgba(234, 179, 8, 0.4)",
                borderColor: "#eab308",
                backgroundColor: "rgba(234, 179, 8, 0.1)"
            });
        } else {
            // Normal (Neon Green)
            apertureControls.start({ rotate: 0, scale: 1 });
            glowControls.start({
                boxShadow: "0 0 40px 10px rgba(109, 255, 142, 0.4)", // Brand Green
                borderColor: "#6DFF8E",
                backgroundColor: "rgba(109, 255, 142, 0.05)"
            });
        }
    }, [isPasswordFocused, showPassword, apertureControls, glowControls]);

    return (
        <div className="w-full h-full flex items-center justify-center relative group">

            {/* Holographic Container */}
            <div className="absolute w-40 h-40 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/50 flex items-center justify-center shadow-2xl overflow-hidden ring-1 ring-white/10">
                {/* Scanning Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(109,255,142,0.05)_50%)] bg-[length:100%_4px] animate-scan opacity-50" />

                {/* Rotating Rings (HUD) */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                    className="absolute w-36 h-36 rounded-full border border-dashed border-[#6DFF8E]/20"
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                    className="absolute w-32 h-32 rounded-full border border-dotted border-[#6DFF8E]/10"
                />

                {/* MAIN EYE BALL */}
                <motion.div
                    animate={glowControls}
                    initial={{ boxShadow: "0 0 30px 5px rgba(109, 255, 142, 0.4)", borderColor: "#6DFF8E" }}
                    className="w-24 h-24 bg-slate-950 rounded-full border-2 relative overflow-hidden flex items-center justify-center shadow-inner"
                >
                    {/* Eyelid (Blinking) */}
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: isBlinking ? "100%" : "0%" }}
                        transition={{ duration: 0.1 }}
                        className="absolute top-0 left-0 w-full bg-slate-900 z-30 pointer-events-none border-b border-slate-800"
                    />

                    {/* Aperture Blades */}
                    <motion.div animate={apertureControls} className="absolute inset-0 z-20 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-1/2 bg-slate-900/90 border-b border-slate-800 origin-bottom transform transition-transform" />
                        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-slate-900/90 border-t border-slate-800 origin-top transform transition-transform" />
                    </motion.div>

                    {/* The Pupil (Scanner) */}
                    <motion.div
                        animate={pupilControls}
                        className="w-10 h-10 bg-slate-950 rounded-full border-[2px] border-[#6DFF8E] shadow-[0_0_15px_rgba(109,255,142,0.6)] relative z-10 flex items-center justify-center"
                        style={{ borderColor: "inherit" }}
                    >
                        {/* Lens Flare */}
                        <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white]" />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent to-white/20 animate-spin-slow" />
                    </motion.div>

                    {/* Grid Overlay */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)] z-10" />
                </motion.div>
            </div>

            {/* Stand */}
            <div className="absolute -bottom-8 w-[2px] h-10 bg-gradient-to-b from-slate-700 to-transparent opacity-50" />
        </div>
    );
}
