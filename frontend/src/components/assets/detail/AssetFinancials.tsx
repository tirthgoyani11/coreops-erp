import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface AssetFinancialsProps {
    asset: any;
}

export function AssetFinancials({ asset }: AssetFinancialsProps) {
    // Read from flat Prisma fields
    const purchasePrice = asset.purchasePrice || asset.purchaseCost || 0;
    const purchaseYear = new Date(asset.purchaseDate || new Date()).getFullYear();
    const currency = asset.currency || 'INR';

    // Use backend depreciation data if available, otherwise calculate
    const usefulLife = asset.depreciation?.usefulLife || 5;
    const salvageValue = asset.depreciation?.salvageValue || (purchasePrice * 0.1);
    const currentBookValue = asset.depreciation?.currentBookValue;
    const depMethod = asset.depreciation?.method === 'declining_balance' ? 'Declining Balance' : 'Straight Line';

    const data = [];
    for (let i = 0; i <= usefulLife; i++) {
        const year = purchaseYear + i;
        const depreciation = ((purchasePrice - salvageValue) / usefulLife) * i;
        const value = Math.max(purchasePrice - depreciation, salvageValue);

        data.push({
            year: year.toString(),
            value: Number(value.toFixed(2)),
            depreciation: Number(depreciation.toFixed(2))
        });
    }

    // Use real book value from backend if available, else estimate from chart
    const displayBookValue = currentBookValue != null ? currentBookValue : (data[1]?.value || purchasePrice);
    const totalDepreciation = purchasePrice - displayBookValue;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(val);
    };

    return (
        <div className="space-y-6">

            {/* Financial Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                    <p className="text-sm text-[var(--text-secondary)]">Original Purchase Value</p>
                    <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">{formatCurrency(purchasePrice)}</h3>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <div className="w-16 h-16 rounded-full bg-[var(--primary)]" />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">Current Book Value</p>
                    <h3 className="text-2xl font-bold text-[var(--primary)] mt-1">{formatCurrency(displayBookValue)}</h3>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                    <p className="text-sm text-[var(--text-secondary)]">Total Depreciation</p>
                    <h3 className="text-2xl font-bold text-red-400 mt-1">-{formatCurrency(Math.abs(totalDepreciation))}</h3>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                    <p className="text-sm text-[var(--text-secondary)]">Salvage Value</p>
                    <h3 className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(salvageValue)}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Useful Life: {usefulLife}y • {depMethod}</p>
                </div>
            </div>

            {/* Depreciation Chart */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Depreciation Schedule ({depMethod})</h3>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                            <XAxis
                                dataKey="year"
                                stroke="var(--text-secondary)"
                                tick={{ fill: 'var(--text-secondary)' }}
                                axisLine={{ stroke: 'var(--border-color)' }}
                            />
                            <YAxis
                                stroke="var(--text-secondary)"
                                tick={{ fill: 'var(--text-secondary)' }}
                                axisLine={{ stroke: 'var(--border-color)' }}
                                tickFormatter={(value) => `${currency === 'INR' ? '₹' : '$'}${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--bg-card)',
                                    borderColor: 'var(--border-color)',
                                    borderRadius: '12px',
                                    color: 'var(--text-primary)'
                                }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                                formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="var(--primary)"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                                name="Book Value"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
