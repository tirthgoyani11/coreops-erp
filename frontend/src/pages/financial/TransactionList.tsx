import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import {
    Download
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function TransactionList() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const res = await api.get('/finance/transactions');
            setTransactions(res.data.data);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Recent Transactions</h3>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500">
                        <tr>
                            <th className="px-6 py-3 text-left">Date</th>
                            <th className="px-6 py-3 text-left">Description</th>
                            <th className="px-6 py-3 text-left">Category</th>
                            <th className="px-6 py-3 text-left">Reference</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                        {transactions.map((tx: any) => (
                            <tr key={tx._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
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
                {transactions.length === 0 && !loading && (
                    <div className="text-center py-12 text-gray-500">
                        No transactions found.
                    </div>
                )}
            </div>
        </Card>
    );
}
