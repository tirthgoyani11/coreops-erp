import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    PieChart, Pie, Cell,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar,
    ResponsiveContainer,
    Legend,
} from 'recharts';

type ChartType = 'pie' | 'line' | 'area' | 'bar' | 'donut';

interface ChartData {
    name: string;
    value: number;
    [key: string]: string | number;
}

interface DashboardChartProps {
    type: ChartType;
    data: ChartData[];
    title: string;
    loading?: boolean;
    height?: number;
    dataKey?: string;
    colors?: string[];
}

const DEFAULT_COLORS = [
    '#B9FF66', // primary
    '#3B82F6', // blue
    '#F97316', // orange
    '#10B981', // green
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null;

    return (
        <div className="bg-[var(--bg-overlay)]/90 backdrop-blur-md border border-[var(--border-color)] rounded-xl px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            {label && <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>}
            {payload.map((entry, index) => (
                <p key={index} className="text-sm font-medium text-[var(--text-primary)]">
                    {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                </p>
            ))}
        </div>
    );
};

export const DashboardChart = memo(function DashboardChart({
    type,
    data,
    title,
    loading = false,
    height = 250,
    dataKey = 'value',
    colors = DEFAULT_COLORS,
}: DashboardChartProps) {
    const chartColors = useMemo(() => colors, [colors]);

    if (loading) {
        return (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                <div className="w-32 h-5 rounded bg-[var(--bg-card-hover)] mb-4 animate-pulse" />
                <div
                    className="w-full rounded-xl bg-[var(--bg-card-hover)] animate-pulse"
                    style={{ height: `${height}px` }}
                />
            </div>
        );
    }

    if (!data?.length) {
        return (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                <h3 className="text-[var(--text-primary)] font-medium mb-4">{title}</h3>
                <div
                    className="w-full rounded-xl bg-[var(--bg-card-hover)] flex items-center justify-center text-[var(--text-muted)]"
                    style={{ height: `${height}px` }}
                >
                    No data available
                </div>
            </div>
        );
    }

    const renderChart = () => {
        switch (type) {
            case 'pie':
            case 'donut':
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={type === 'donut' ? 50 : 0}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey={dataKey}
                            >
                                {data.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={chartColors[index % chartColors.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                );

            case 'line':
            case 'area':
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id={`colorGradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={chartColors[0]} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={chartColors[0]} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                            <XAxis
                                dataKey="name"
                                stroke="#71717a"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="var(--text-secondary)"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-color)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area
                                type="monotone"
                                dataKey={dataKey}
                                stroke={chartColors[0]}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill={`url(#colorGradient-${dataKey})`}
                                activeDot={{ r: 6, fill: chartColors[0], stroke: 'var(--bg-card)', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                );

            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                            <XAxis
                                dataKey="name"
                                stroke="#71717a"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="var(--text-secondary)"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)', opacity: 0.5 }} />
                            <Bar
                                dataKey={dataKey}
                                fill={chartColors[0]}
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                );

            default:
                return null;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6"
        >
            <h3 className="text-[var(--text-primary)] font-medium mb-4">{title}</h3>
            {renderChart()}
        </motion.div>
    );
});

export default DashboardChart;
