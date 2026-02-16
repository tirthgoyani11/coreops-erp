import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ParticleGlobe } from '../components/ParticleGlobe';
import { CyberLens } from '../components/CyberLens';

export function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();

    // State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [activeField, setActiveField] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            setIsLeaving(true);
            const timer = setTimeout(() => {
                const redirectTo = searchParams.get('redirect') || '/';
                navigate(redirectTo, { replace: true });
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, navigate, searchParams]);

    // Handle Email Typing
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        setIsTyping(true);
        const timer = setTimeout(() => setIsTyping(false), 200);
        return () => clearTimeout(timer);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        await login({ email, password });
    };

    // Determine Lens State
    const getLensState = () => {
        if (error) return 'error';
        if (isAuthenticated) return 'success';
        return 'idle';
    };

    return (
        <AnimatePresence mode='wait'>
            {!isLeaving && (
                <motion.div
                    key="login-page"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
                    transition={{ duration: 0.8 }}
                    className="min-h-screen w-full flex bg-[#000000] text-white overflow-hidden font-sans relative"
                >
                    {/* Background: Subtle Noise & Vignette */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0 mix-blend-overlay" />

                    {/* LEFT PANEL - CONTENT */}
                    <div className="w-full lg:w-[45%] flex flex-col justify-center p-8 sm:p-12 lg:p-24 relative z-20">

                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="max-w-md w-full mx-auto"
                        >
                            {/* Logo Area */}
                            <div className="mb-12 flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#6DFF8E] rounded-xl flex items-center justify-center shadow-lg shadow-[#6DFF8E]/20 text-black">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold tracking-wide text-white">COREOPS <span className="text-[#6DFF8E]">ERP</span></span>
                            </div>

                            {/* Cyber Lens Header (Better Positioning) */}
                            <div className="mb-8 w-full flex justify-center py-6 relative">
                                <div className="w-32 h-32">
                                    <CyberLens
                                        isTyping={isTyping}
                                        isFocused={!!activeField}
                                        isPeeking={showPassword}
                                        state={getLensState()}
                                    />
                                </div>
                            </div>

                            {/* Main Headline */}
                            <h1 className="text-4xl font-light tracking-tight mb-2 text-white">
                                Welcome Back
                            </h1>
                            <p className="text-slate-400 mb-8 text-sm">
                                Enter your credentials to access the secure network.
                            </p>

                            {/* FORM */}
                            <form onSubmit={handleSubmit} className="space-y-6 relative">

                                {/* Inputs */}
                                <div className="space-y-6">
                                    <div className="group relative">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={handleEmailChange}
                                            onFocus={() => setActiveField('email')}
                                            onBlur={() => setActiveField(null)}
                                            className="block w-full bg-transparent border-b border-white/10 py-3 text-lg focus:outline-none focus:border-[#6DFF8E] transition-colors text-white placeholder-transparent peer"
                                            placeholder="Identity"
                                            required
                                        />
                                        <label className={`absolute left-0 transition-all duration-300 pointer-events-none uppercase tracking-widest text-[10px] font-bold ${activeField === 'email' || email ? '-top-4 text-[#6DFF8E]' : 'top-3 text-white/30'}`}>
                                            Identity
                                        </label>
                                    </div>

                                    <div className="group relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setActiveField('password')}
                                            onBlur={() => setActiveField(null)}
                                            className="block w-full bg-transparent border-b border-white/10 py-3 text-lg focus:outline-none focus:border-[#6DFF8E] transition-colors text-white placeholder-transparent peer pr-10"
                                            placeholder="Security Token"
                                            required
                                        />
                                        <label className={`absolute left-0 transition-all duration-300 pointer-events-none uppercase tracking-widest text-[10px] font-bold ${activeField === 'password' || password ? '-top-4 text-[#6DFF8E]' : 'top-3 text-white/30'}`}>
                                            Security Key
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-0 top-3 text-white/30 hover:text-[#6DFF8E] transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Remember Me & Forgot Password */}
                                <div className="flex items-center justify-between text-xs">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded border-slate-700 bg-transparent text-[#6DFF8E] focus:ring-0 focus:ring-offset-0" />
                                        <span className="text-slate-400 group-hover:text-white transition-colors">Remember device</span>
                                    </label>
                                    <Link to="/forgot-password" className="text-slate-400 hover:text-[#6DFF8E] transition-colors font-medium">
                                        Recovery Protocol?
                                    </Link>
                                </div>

                                {/* Error */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="text-red-400 text-sm font-mono flex items-center gap-2"
                                        >
                                            <span className="w-1 h-1 bg-red-400 rounded-full" />
                                            {error}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Action */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-white text-black h-12 rounded-lg font-bold text-sm uppercase tracking-widest mt-4 hover:bg-[#6DFF8E] transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.98]"
                                >
                                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                                        <>
                                            Authenticate
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>

                        {/* Footer Copyright */}
                        <div className="absolute bottom-8 left-8 sm:left-12 lg:left-24 text-white/20 text-[10px] uppercase tracking-widest font-mono">
                            System v4.0.1 // {new Date().getFullYear()}
                        </div>
                    </div>

                    {/* RIGHT PANEL - 3D ART */}
                    <div className="hidden lg:flex flex-1 relative bg-black items-center justify-center">
                        <div className="absolute inset-0 z-0">
                            <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }}>
                                <ParticleGlobe />
                                <OrbitControls
                                    enableZoom={false}
                                    enableRotate={true}
                                    autoRotate={true}
                                    autoRotateSpeed={0.5}
                                    enablePan={false}
                                />
                            </Canvas>
                        </div>

                        {/* Overlay Gradient for seamless blend */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent z-10 pointer-events-none" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
