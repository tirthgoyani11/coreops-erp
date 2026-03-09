import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, Search, Loader2, ArrowUpDown, FileText, Download } from 'lucide-react';
import api from '../lib/api';

type ValuationMethod = 'FIFO' | 'LIFO' | 'WAC';

interface ValuationItem {
    id: string;
    name: string;
    sku: string;
    category: string;
    office: string;
    currentQuantity: number;
    totalQuantity: number; // Valued quantity
    totalValue: number;
    avgCostPerUnit: number;
}

interface ValuationReport {
    method: ValuationMethod;
    totalQuantity: number;
    totalValue: number;
    itemCount: number;
    items: ValuationItem[];
}

export function InventoryValuation() {
    const [method, setMethod] = useState<ValuationMethod>('WAC');
    const [report, setReport] = useState<ValuationReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof ValuationItem; direction: 'asc' | 'desc' } | null>(null);

    const fetchReport = async (selectedMethod: ValuationMethod) => {
        try {
            setIsLoading(true);
            const res = await api.get(`/inventory-ext/valuation/report?method=${selectedMethod}`);
            if (res.data.success) {
                setReport(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch valuation report:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReport(method);
    }, [method]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    };

    const handleSort = (key: keyof ValuationItem) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredAndSortedItems = () => {
        if (!report) return [];
        let items = [...report.items];

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            items = items.filter(
                (item) =>
                    item.name.toLowerCase().includes(lowerSearch) ||
                    item.sku.toLowerCase().includes(lowerSearch) ||
                    item.category.toLowerCase().includes(lowerSearch) ||
                    (item.office && item.office.toLowerCase().includes(lowerSearch))
            );
        }

        if (sortConfig) {
            items.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return items;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <Calculator className="w-6 h-6 text-[var(--primary)]" />
                        Inventory Valuation
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Calculate the financial value of your inventory stock using accepted accounting methods.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-[var(--bg-overlay)] p-1 rounded-lg inline-flex">
                        {(['FIFO', 'LIFO', 'WAC'] as ValuationMethod[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMethod(m)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${method === m
                                        ? 'bg-[var(--primary)] text-black shadow-md'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:border-[var(--primary)] transition-colors">
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-28 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl" />
                    ))}
                </div>
            ) : report ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-[var(--primary)]/10 to-transparent border border-[var(--primary)]/30 rounded-xl p-6"
                    >
                        <div className="flex items-center gap-3 mb-2 text-[var(--primary)] text-sm font-semibold">
                            <TrendingUp className="w-4 h-4" />
                            Total Value ({report.method})
                        </div>
                        <div className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">
                            {formatCurrency(report.totalValue)}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6"
                    >
                        <div className="text-[var(--text-secondary)] text-sm font-semibold mb-2">Total Items Tracked</div>
                        <div className="text-2xl font-bold text-[var(--text-primary)]">
                            {report.itemCount} SKUs
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6"
                    >
                        <div className="text-[var(--text-secondary)] text-sm font-semibold mb-2">Total Units Valued</div>
                        <div className="text-2xl font-bold text-[var(--text-primary)]">
                            {report.totalQuantity} units
                        </div>
                    </motion.div>
                </div>
            ) : null}

            {/* Main Table Area */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden flex flex-col h-[calc(100vh-340px)] min-h-[400px]">
                <div className="p-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            placeholder="Search by Item Name, SKU, or Category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
                        </div>
                    ) : !report || filteredAndSortedItems().length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] p-8">
                            <FileText className="w-12 h-12 mb-4 opacity-50" />
                            <p>No valuation data found. Make sure items have received batches.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-[var(--bg-card)] z-10 shadow-sm border-b border-[var(--border-color)]">
                                <tr>
                                    <th className="p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--bg-overlay)]" onClick={() => handleSort('name')}>
                                        <div className="flex items-center gap-1">Item <ArrowUpDown className="w-3 h-3" /></div>
                                    </th>
                                    <th className="p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--bg-overlay)]" onClick={() => handleSort('sku')}>
                                        <div className="flex items-center gap-1">SKU <ArrowUpDown className="w-3 h-3" /></div>
                                    </th>
                                    <th className="p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider hidden sm:table-cell">Office</th>
                                    <th className="p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-right cursor-pointer hover:bg-[var(--bg-overlay)]" onClick={() => handleSort('totalQuantity')}>
                                        <div className="flex items-center justify-end gap-1">Qty Valued <ArrowUpDown className="w-3 h-3" /></div>
                                    </th>
                                    <th className="p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-right cursor-pointer hover:bg-[var(--bg-overlay)]" onClick={() => handleSort('avgCostPerUnit')}>
                                        <div className="flex items-center justify-end gap-1">Avg Unit Cost <ArrowUpDown className="w-3 h-3" /></div>
                                    </th>
                                    <th className="p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-right cursor-pointer hover:bg-[var(--bg-overlay)]" onClick={() => handleSort('totalValue')}>
                                        <div className="flex items-center justify-end gap-1">Total {method} Value <ArrowUpDown className="w-3 h-3" /></div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedItems().map((item, index) => (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: Math.min(index * 0.02, 0.5) }}
                                        key={item.id}
                                        className="border-b border-[var(--border-color)] hover:bg-[var(--bg-overlay)] transition-colors"
                                    >
                                        <td className="p-4">
                                            <div className="font-semibold text-[var(--text-primary)]">{item.name}</div>
                                            <div className="text-xs text-[var(--text-muted)]">{item.category}</div>
                                        </td>
                                        <td className="p-4 text-[var(--text-secondary)] text-sm">{item.sku}</td>
                                        <td className="p-4 text-[var(--text-secondary)] text-sm hidden sm:table-cell">{item.office || 'N/A'}</td>
                                        <td className="p-4 text-right">
                                            <div className="font-medium text-[var(--text-primary)]">{item.totalQuantity}</div>
                                            {item.totalQuantity !== item.currentQuantity && (
                                                <div className="text-[10px] text-orange-400 mt-0.5">Sys: {item.currentQuantity}</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right text-[var(--text-secondary)] font-mono text-sm">
                                            {formatCurrency(item.avgCostPerUnit)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="font-bold text-[var(--text-primary)]">
                                                {formatCurrency(item.totalValue)}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
