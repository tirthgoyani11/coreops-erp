import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    trend?: string;
    trendUp?: boolean;
    color?: string;
    delay?: number;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, color = "emerald", delay = 0 }: StatCardProps) {
    const getColor = (c: string) => {
        const colors: Record<string, string> = {
            emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
            blue: "text-blue-400 bg-blue-400/10 border-blue-400/20",
            amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
            purple: "text-purple-400 bg-purple-400/10 border-purple-400/20",
            red: "text-red-400 bg-red-400/10 border-red-400/20",
        };
        return colors[c] || colors.emerald;
    };

    const colorClasses = getColor(color);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className={`relative overflow-hidden rounded-xl border p-6 backdrop-blur-md bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-colors group shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] ${colorClasses.split(' ')[2]}`} // Use border class
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${colorClasses}`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <span className={`text-xs font-mono px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {trend}
                    </span>
                )}
            </div>

            <div className="space-y-1">
                <h3 className="text-[var(--text-secondary)] text-sm font-medium tracking-wide uppercase">{title}</h3>
                <div className="text-2xl font-bold font-mono text-[var(--text-primary)] tracking-tight">
                    {value}
                </div>
            </div>

            {/* Decorative background visual */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 blur-2xl group-hover:opacity-10 transition-opacity ${colorClasses.split(' ')[1].replace('/10', '')}`} />
        </motion.div>
    );
}
