import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowRight, Layers, Zap, Activity, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';
import { SecurityBot } from '../components/SecurityBot';

// --- 3D Scene Components (Unchanged) ---

function Scene() {
    return (
        <InteractiveGroup>
            <GlobeContent />
        </InteractiveGroup>
    )
}

function InteractiveGroup({ children }: { children: React.ReactNode }) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            const targetX = state.pointer.x * 0.2;
            const targetY = -state.pointer.y * 0.2;

            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetX, 0.1);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetY, 0.1);
        }
    });

    return <group ref={groupRef}>{children}</group>;
}

function GlobeContent() {
    const nodes = useMemo(() => {
        const positions = [
            [0.8, 0.5, 0.8], [-0.5, 0.8, 0.6], [0.2, -0.7, 0.9],
            [-0.8, -0.2, 0.7], [0.9, -0.4, 0.2], [-0.3, 0.3, -0.9],
            [0.6, 0.6, -0.4], [-0.7, -0.6, -0.3], [0.1, 0.9, 0.1],
            [-0.9, 0.1, -0.2], [0.5, -0.5, -0.6], [-0.4, -0.8, 0.2],
            [0.3, 0.1, -0.9], [-0.2, 0.9, -0.1], [0.9, -0.1, -0.3]
        ];

        return positions.map(pos => {
            const vector = new THREE.Vector3(...pos).normalize().multiplyScalar(1.2);
            return {
                vec: vector,
                position: [vector.x, vector.y, vector.z] as [number, number, number]
            };
        });
    }, []);

    const connections = useMemo(() => {
        const lines = [];
        const threshold = 1.5;

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dist = nodes[i].vec.distanceTo(nodes[j].vec);
                if (dist < threshold) {
                    lines.push([nodes[i].vec, nodes[j].vec]);
                }
            }
        }
        return lines;
    }, [nodes]);

    const Ring = ({ radius, rotation, opacity = 0.3 }: { radius: number, rotation: [number, number, number], opacity?: number }) => (
        <group rotation={rotation}>
            <LINE_LOOP radius={radius} opacity={opacity} />
        </group>
    );

    return (
        <>
            <Sphere args={[1.18, 64, 64]}>
                <meshBasicMaterial color="#022c22" transparent opacity={0.9} />
            </Sphere>
            <Sphere args={[1.2, 64, 64]}>
                <meshBasicMaterial color="#84cc16" wireframe transparent opacity={0.15} />
            </Sphere>
            <Sphere args={[1.22, 48, 48]}>
                <meshBasicMaterial color="#84cc16" wireframe transparent opacity={0.05} />
            </Sphere>
            <Sphere args={[1.4, 64, 64]}>
                <meshBasicMaterial color="#84cc16" transparent opacity={0.05} side={THREE.BackSide} />
            </Sphere>
            {nodes.map((node, i) => (
                <group key={i} position={node.position}>
                    <Sphere args={[0.03, 16, 16]}>
                        <meshBasicMaterial color="#ecfccb" />
                    </Sphere>
                    <mesh position={[0, 0, 0]}>
                        <sphereGeometry args={[0.05, 16, 16]} />
                        <meshBasicMaterial color="#84cc16" transparent opacity={0.4} />
                    </mesh>
                </group>
            ))}
            {connections.map((line, i) => (
                <Line key={`line-${i}`} points={line} color="#a3e635" lineWidth={1} transparent opacity={0.2} />
            ))}
            <Ring radius={1.35} rotation={[Math.PI / 3, Math.PI / 4, 0]} opacity={0.4} />
            <Ring radius={1.45} rotation={[-Math.PI / 3, -Math.PI / 6, 0]} opacity={0.4} />
            <Ring radius={1.4} rotation={[Math.PI / 2.5, 0, Math.PI / 6]} opacity={0.4} />
            <Ring radius={1.55} rotation={[0, Math.PI / 2, Math.PI / 4]} opacity={0.2} />
            <Ring radius={1.6} rotation={[Math.PI / 6, Math.PI / 3, Math.PI / 2]} opacity={0.2} />
            <Ring radius={1.3} rotation={[Math.PI / 1.5, Math.PI / 1.5, 0]} opacity={0.3} />
            <Ring radius={1.5} rotation={[-Math.PI / 4, 0, -Math.PI / 4]} opacity={0.2} />
        </>
    );
}

const LINE_LOOP = ({ radius, opacity }: { radius: number, opacity: number }) => {
    const points = useMemo(() => {
        const pts = [];
        for (let i = 0; i <= 128; i++) {
            const theta = (i / 128) * Math.PI * 2;
            pts.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
        }
        return pts;
    }, [radius]);
    return <Line points={points} color="#a3e635" lineWidth={1} transparent opacity={opacity} />;
};


// --- LOGIN COMPONENT ---

export function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [activeField, setActiveField] = useState<string | null>(null);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            const redirectTo = searchParams.get('redirect') || '/';
            navigate(redirectTo, { replace: true });
        }
    }, [isAuthenticated, navigate, searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        const success = await login({ email, password });
        if (success) {
            // Redirect to requested page or dashboard
            const redirectTo = searchParams.get('redirect') || '/';
            navigate(redirectTo, { replace: true });
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-[#030304] text-white overflow-hidden selection:bg-[var(--primary)] selection:text-black">

            {/* LEFT PANEL - FORM */}
            <div className="w-full lg:w-[40%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative z-20 bg-[#060607] border-r border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2"
                >
                    <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
                        <Layers className="w-5 h-5 text-black" />
                    </div>
                    <span className="font-bold tracking-tight text-xl">CoreOps</span>
                </motion.div>

                {/* Main Form Area */}
                <div className="w-full max-w-sm mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="relative"
                    >
                        {/* SECURITY BOT - Interactive React Component */}
                        <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-32 h-32 pointer-events-none z-50">
                            <SecurityBot
                                emailLength={email.length}
                                isPasswordFocused={activeField === 'password'}
                                showPassword={showPassword}
                            />
                        </div>

                        <h1 className="text-5xl font-extrabold tracking-tight mb-4 leading-[1.1]">
                            Enterprise <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-cyan-400">Login.</span>
                        </h1>
                        <p className="text-zinc-500 text-lg mb-10 leading-relaxed">
                            Unify your distributed enterprise operations.
                        </p>
                    </motion.div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3 overflow-hidden"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-6">
                            {/* Email Input */}
                            <div className="relative group">
                                <label className={`absolute left-0 -top-5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${activeField === 'email' || email ? 'text-[var(--primary)]' : 'text-zinc-600'}`}>
                                    Enterprise ID
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setActiveField('email')}
                                    onBlur={() => setActiveField(null)}
                                    className="w-full bg-transparent border-b border-zinc-700 py-3 text-lg font-medium focus:outline-none focus:border-[var(--primary)] transition-colors placeholder:text-zinc-800"
                                    placeholder="name@global.com"
                                    required
                                />
                            </div>

                            {/* Password Input */}
                            <div className="relative group">
                                <div className="flex justify-between items-center absolute -top-5 w-full">
                                    <label className={`text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${activeField === 'password' || password ? 'text-[var(--primary)]' : 'text-zinc-600'}`}>
                                        Secure Key
                                    </label>

                                    {/* Show/Hide Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-zinc-500 hover:text-[var(--primary)] transition-colors focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setActiveField('password')}
                                    onBlur={() => setActiveField(null)}
                                    className="w-full bg-transparent border-b border-zinc-700 py-3 text-lg font-medium focus:outline-none focus:border-[var(--primary)] transition-colors placeholder:text-zinc-800"
                                    placeholder={showPassword ? "PASSWORD" : "••••••••"}
                                    required
                                />
                            </div>

                            {/* Remember Me & Forgot Password */}
                            <div className="flex items-center justify-between pt-2">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-zinc-700 bg-transparent text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-offset-0 focus:ring-1 cursor-pointer"
                                    />
                                    <span className="text-zinc-500 text-sm group-hover:text-zinc-400 transition-colors">
                                        Remember me
                                    </span>
                                </label>
                                <a
                                    href="/forgot-password"
                                    className="text-sm text-zinc-500 hover:text-[var(--primary)] transition-colors"
                                >
                                    Forgot password?
                                </a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-white text-black h-12 rounded-lg font-bold text-sm uppercase tracking-wide mt-8 hover:bg-[var(--primary)] transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                        >
                            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-8 border-t border-zinc-900">
                        <p className="text-zinc-600 text-xs font-mono">
                            Enterprise Access Portal
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 text-zinc-700 text-xs font-mono">
                    <div className="w-2 h-2 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    v2.5.0 // SECURE
                </div>
            </div>

            {/* RIGHT PANEL - 3D GLOBAL VISUALS */}
            <div className="hidden lg:flex flex-1 relative bg-[#030304] items-center justify-center overflow-hidden">

                {/* Gradient Vingette */}
                <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#030304]/80 pointer-events-none z-10" />

                {/* 3D SCENE */}
                <div className="absolute inset-0 z-0">
                    <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }}>
                        <Scene />
                        <OrbitControls
                            enableZoom={false}
                            enableRotate={true}
                            autoRotate={true}
                            autoRotateSpeed={0.5}
                            enablePan={false}
                        />
                        <ambientLight intensity={0.5} color="#10b981" />
                        <pointLight position={[10, 10, 10]} intensity={1.5} color="#34d399" />
                        <spotLight position={[-10, -10, -5]} intensity={1} color="#059669" />
                        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
                    </Canvas>
                </div>

                {/* Stats Overlay */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="absolute bottom-12 right-12 flex gap-8 z-10 pointer-events-none"
                >
                    <div className="text-right">
                        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
                            <Zap className="w-3 h-3 text-[var(--primary)]" /> System Status
                        </h3>
                        <p className="text-white font-mono text-sm tracking-wider flex items-center justify-end gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
                            OPERATIONAL
                        </p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
                            <Activity className="w-3 h-3 text-[var(--primary)]" /> Latency
                        </h3>
                        <p className="text-white font-mono text-sm tracking-wider flex items-center justify-end gap-2">
                            24ms
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
