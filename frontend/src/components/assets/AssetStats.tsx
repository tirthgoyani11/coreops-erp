import { motion } from 'framer-motion';
import { Box, Wrench, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect, useState } from 'react';
import api from '../../lib/api';

interface AssetStatsProps {
    assets: any[];
    loading?: boolean;
}

export function AssetStats({ assets, loading }: AssetStatsProps) {
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        maintenance: 0,
        retired: 0,
        totalValue: 0
    });

    useEffect(() => {
        // Fetch stats from backend Aggregation API for scalability
        const fetchStats = async () => {
            try {
                const res = await api.get('/assets/stats');
                const data = res.data.data || res.data;
                setStats({
                    total: data.total || 0,
                    active: data.active || 0,
                    maintenance: data.maintenance || 0,
                    retired: data.retired || 0,
                    totalValue: data.totalValue || 0
                });
            } catch (error) {
                console.error("Failed to fetch asset stats", error);
            }
        };

        fetchStats();
    }, [assets]); // Re-fetch when assets list changes (e.g. after add/delete)

    const statCards = [
        {
            label: "Total Assets",
            value: stats.total,
            icon: Box,
            color: "text-blue-400",
            bg: "bg-blue-400/10",
            border: "border-blue-400/20"
        },
        {
            label: "Active",
            value: stats.active,
            icon: CheckCircle,
            color: "text-[var(--primary)]",
            bg: "bg-[var(--primary)]/10",
            border: "border-[var(--primary)]/20"
        },
        {
            label: "In Maintenance",
            value: stats.maintenance,
            icon: Wrench,
            color: "text-amber-400",
            bg: "bg-amber-400/10",
            border: "border-amber-400/20"
        },
        {
            label: "Retired / Lost",
            value: stats.retired,
            icon: AlertTriangle,
            color: "text-red-400",
            bg: "bg-red-400/10",
            border: "border-red-400/20"
        },
        {
            label: "Total Value",
            value: stats.totalValue,
            icon: Box, // Using Box as placeholder, ideally DollarSign or similar
            color: "text-emerald-400",
            bg: "bg-emerald-400/10",
            border: "border-emerald-400/20"
        }
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl bg-[var(--bg-card)] animate-pulse border border-[var(--border-color)]" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {statCards.map((stat, index) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                        "relative overflow-hidden rounded-2xl p-5 border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]",
                        "bg-[var(--bg-card)]",
                        stat.border
                    )}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-secondary)]">{stat.label}</p>
                            <h3 className="text-2xl font-bold mt-1 text-[var(--text-primary)]">
                                {stat.label === 'Total Value' ? formatCurrency(stat.value) : stat.value}
                            </h3>
                        </div>
                        <div className={cn("p-2 rounded-xl", stat.bg, stat.color)}>
                            <stat.icon size={20} />
                        </div>
                    </div>

                    {/* Decorative Background Glow */}
                    <div className={cn("absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20", stat.bg)} />
                </motion.div>
            ))}
        </div>
    );
}

// Helper to format currency
function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
