import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import {
    Download
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

type TransactionListProps = {
    startDate: string;
    endDate: string;
    refreshKey: number;
};

export function TransactionList({ startDate, endDate, refreshKey }: TransactionListProps) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchTransactions();
    }, [startDate, endDate, refreshKey]);

    const fetchTransactions = async () => {
        try {
            const res = await api.get('/finance/transactions', {
                params: { startDate, endDate, limit: 200, page: 1 },
            });
            setTransactions(Array.isArray(res.data?.data) ? res.data.data : []);
            setTotal(Number(res.data?.total) || 0);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            setTransactions([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!transactions.length) return;

        const headers = ['date', 'description', 'category', 'referenceType', 'referenceId', 'type', 'amount'];
        const rows = transactions.map((tx: any) => (
            headers.map((key) => {
                const value = tx[key] ?? '';
                const text = String(value).replaceAll('"', '""');
                return `"${text}"`;
            }).join(',')
        ));

        const csv = `${headers.join(',')}\n${rows.join('\n')}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Transactions</h3>
                    <p className="text-xs text-gray-500">{new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()} • {total} records</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleExport} disabled={!transactions.length}>
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                </div>
            </div>

            <div className="overflow-auto max-h-[600px] w-full">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md text-gray-500 font-medium border-b border-[var(--border-color)] shadow-sm">
                        <tr>
                            <th className="px-6 py-3 text-left">Date</th>
                            <th className="px-6 py-3 text-left">Description</th>
                            <th className="px-6 py-3 text-left">Category</th>
                            <th className="px-6 py-3 text-left">Reference</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-[var(--bg-card)]">
                        {transactions.map((tx: any) => (
                            <tr key={tx.id} className="group hover:bg-[var(--color-primary)]/5 dark:hover:bg-[var(--color-primary)]/10 transition-colors cursor-pointer relative">
                                <td className="px-6 py-4 text-gray-500">
                                    {new Date(tx.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                                    {tx.description}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                        {tx.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500">
                                    {tx.referenceType} #{tx.referenceId || 'N/A'}
                                </td>
                                <td className={`px-6 py-4 text-right font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {tx.type === 'INCOME' ? '+' : '-'} ₹{tx.amount?.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && (
                    <div className="text-center py-6 text-gray-500 text-sm">Loading transactions...</div>
                )}
                {transactions.length === 0 && !loading && (
                    <div className="text-center py-12 text-gray-500">
                        No transactions found.
                    </div>
                )}
            </div>
        </Card>
    );
}
