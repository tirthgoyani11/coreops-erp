import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Mail, ArrowRight } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ParticleGlobe } from '../components/ParticleGlobe';
import { CyberLens } from '../components/CyberLens';

export function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [activeField, setActiveField] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);

    // Mock Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setIsSubmitted(true);
        }, 1500);
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        setIsTyping(true);
        const timer = setTimeout(() => setIsTyping(false), 200);
        return () => clearTimeout(timer);
    };

    return (
        <div className="min-h-screen w-full flex bg-[#000000] text-white overflow-hidden font-sans relative">
            {/* Background: Subtle Noise & Vignette */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0 mix-blend-overlay" />

            {/* LEFT PANEL */}
            <div className="w-full lg:w-[45%] flex flex-col justify-center p-8 sm:p-12 lg:p-24 relative z-20">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-md w-full mx-auto"
                >
                    {/* Back Link */}
                    <Link to="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-[#6DFF8E] transition-colors mb-12 text-sm font-bold uppercase tracking-widest group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Return to Identify
                    </Link>

                    {/* Header */}
                    <div className="mb-12">
                        <div className="w-12 h-12 bg-[#6DFF8E]/10 rounded-xl flex items-center justify-center mb-6 border border-[#6DFF8E]/20 text-[#6DFF8E]">
                            <Mail className="w-6 h-6" />
                        </div>
                        <h1 className="text-4xl font-light tracking-tight mb-3 text-white">
                            Recovery <span className="font-bold text-[#6DFF8E]">Protocol</span>
                        </h1>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Enter your identity signature (email) to initiate the secure credential reset process.
                        </p>
                    </div>

                    {/* Cyber Lens (Small Version) */}
                    <div className="absolute -right-12 top-24 w-32 h-32 pointer-events-none opacity-30 hidden xl:block">
                        <CyberLens
                            isTyping={isTyping}
                            isFocused={!!activeField}
                            state={isSubmitted ? 'success' : 'idle'}
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        {!isSubmitted ? (
                            <motion.form
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleSubmit}
                                className="space-y-8"
                            >
                                <div className="group relative">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={handleEmailChange}
                                        onFocus={() => setActiveField('email')}
                                        onBlur={() => setActiveField(null)}
                                        className="block w-full bg-transparent border-b border-white/10 py-3 text-lg focus:outline-none focus:border-[#6DFF8E] transition-colors text-white placeholder-transparent peer"
                                        placeholder="Identity Signature"
                                        required
                                    />
                                    <label className={`absolute left-0 transition-all duration-300 pointer-events-none uppercase tracking-widest text-[10px] font-bold ${activeField === 'email' || email ? '-top-4 text-[#6DFF8E]' : 'top-3 text-white/30'}`}>
                                        Identity Signature
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-white text-black h-12 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-[#6DFF8E] transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.98]"
                                >
                                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                                        <>
                                            Initiate Reset
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-[#6DFF8E]/10 border border-[#6DFF8E]/20 p-6 rounded-lg text-center"
                            >
                                <h3 className="text-[#6DFF8E] font-bold uppercase tracking-widest mb-2">Protocol Initiated</h3>
                                <p className="text-slate-300 text-sm mb-6">
                                    Should the identity <strong>{email}</strong> exist in our registry, a secure transmission has been dispatched.
                                </p>
                                <button
                                    onClick={() => setIsSubmitted(false)}
                                    className="text-white text-xs uppercase tracking-widest hover:text-[#6DFF8E] underline underline-offset-4"
                                >
                                    Retry Protocol
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer Copyright */}
                    <div className="absolute bottom-8 left-8 sm:left-12 lg:left-24 text-white/20 text-[10px] uppercase tracking-widest font-mono">
                        System v4.0.1 // Recovery Mode
                    </div>
                </motion.div>
            </div>

            {/* RIGHT PANEL - 3D ART */}
            <div className="hidden lg:flex flex-1 relative bg-black items-center justify-center">
                {/* Different Angle for Variety */}
                <div className="absolute inset-0 z-0 opacity-60">
                    <Canvas camera={{ position: [2, 2, 5], fov: 45 }}>
                        <ParticleGlobe />
                        <OrbitControls
                            enableZoom={false}
                            enableRotate={true}
                            autoRotate={true}
                            autoRotateSpeed={-0.3} // Reverse rotation for difference
                            enablePan={false}
                        />
                    </Canvas>
                </div>

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent z-10 pointer-events-none" />
            </div>
        </div>
    );
}
