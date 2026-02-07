import { memo } from 'react';
import type { ComponentType } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: ComponentType<LucideProps>;
    change?: number;
    changeLabel?: string;
    onClick?: () => void;
    color?: 'primary' | 'blue' | 'orange' | 'red' | 'green';
    loading?: boolean;
}

const colorClasses = {
    primary: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const iconBgClasses = {
    primary: 'bg-[var(--primary)]/20',
    blue: 'bg-blue-500/20',
    orange: 'bg-orange-500/20',
    red: 'bg-red-500/20',
    green: 'bg-emerald-500/20',
};

export const StatCard = memo(function StatCard({
    title,
    value,
    icon: Icon,
    change,
    changeLabel,
    onClick,
    color = 'primary',
    loading = false,
}: StatCardProps) {
    const isPositive = change !== undefined && change >= 0;

    if (loading) {
        return (
            <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5" />
                    <div className="w-16 h-4 rounded bg-white/5" />
                </div>
                <div className="w-24 h-8 rounded bg-white/5 mb-2" />
                <div className="w-20 h-4 rounded bg-white/5" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={onClick ? { scale: 1.02, y: -2 } : undefined}
            onClick={onClick}
            className={`
                bg-[#18181b] border border-white/5 rounded-2xl p-6
                ${onClick ? 'cursor-pointer hover:border-white/10 transition-all' : ''}
            `}
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgClasses[color]}`}>
                    <Icon className={`w-6 h-6 ${colorClasses[color].split(' ')[1]}`} />
                </div>

                {change !== undefined && (
                    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isPositive
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                        }`}>
                        {isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                        ) : (
                            <TrendingDown className="w-3 h-3" />
                        )}
                        {isPositive ? '+' : ''}{change}%
                    </div>
                )}
            </div>

            <div className="text-3xl font-bold text-white mb-1 tracking-tight">
                {value}
            </div>

            <div className="text-sm text-[var(--text-muted)]">
                {title}
                {changeLabel && <span className="ml-1 text-xs">({changeLabel})</span>}
            </div>
        </motion.div>
    );
});

export default StatCard;
