import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    PieChart, Pie, Cell,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar,
    ResponsiveContainer,
    Legend,
} from 'recharts';

type ChartType = 'pie' | 'line' | 'bar' | 'donut';

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
        <div className="bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
            {label && <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>}
            {payload.map((entry, index) => (
                <p key={index} className="text-sm font-medium text-white">
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
            <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6">
                <div className="w-32 h-5 rounded bg-white/5 mb-4 animate-pulse" />
                <div
                    className="w-full rounded-xl bg-white/5 animate-pulse"
                    style={{ height: `${height}px` }}
                />
            </div>
        );
    }

    if (!data?.length) {
        return (
            <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6">
                <h3 className="text-white font-medium mb-4">{title}</h3>
                <div
                    className="w-full rounded-xl bg-white/5 flex items-center justify-center text-[var(--text-muted)]"
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
                                wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                );

            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis
                                dataKey="name"
                                stroke="#71717a"
                                fontSize={12}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#71717a"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey={dataKey}
                                stroke={chartColors[0]}
                                strokeWidth={2}
                                dot={{ fill: chartColors[0], strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={height}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis
                                dataKey="name"
                                stroke="#71717a"
                                fontSize={12}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#71717a"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
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
            className="bg-[#18181b] border border-white/5 rounded-2xl p-6"
        >
            <h3 className="text-white font-medium mb-4">{title}</h3>
            {renderChart()}
        </motion.div>
    );
});

export default DashboardChart;
