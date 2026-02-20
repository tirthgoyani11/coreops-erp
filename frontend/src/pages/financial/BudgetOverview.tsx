import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Plus } from 'lucide-react';

export function BudgetOverview() {
    const [budgets, setBudgets] = useState([]);

    useEffect(() => {
        fetchBudgets();
    }, []);

    const fetchBudgets = async () => {
        try {
            const res = await api.get('/finance/budgets');
            setBudgets(res.data.data);
        } catch (error) {
            console.error('Failed to fetch budgets:', error);
        } finally {
            // done
        }
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {budgets.map((budget: any) => {
                const percent = budget.amount.limit > 0 ? Math.min((budget.amount.spent / budget.amount.limit) * 100, 100) : 0;
                const color = percent > 90 ? 'bg-red-500' : percent > 75 ? 'bg-yellow-500' : 'bg-green-500';

                return (
                    <Card key={budget._id} className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{budget.category}</h3>
                                <p className="text-xs text-gray-500">{new Date(0, budget.period.month - 1).toLocaleString('default', { month: 'long' })} {budget.period.year}</p>
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                ₹{budget.amount.limit.toLocaleString()}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span>Spent: ₹{budget.amount.spent.toLocaleString()}</span>
                                <span className={percent > 90 ? 'text-red-500 font-bold' : 'text-gray-500'}>
                                    {percent.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${color} transition-all duration-500`}
                                    style={{ width: `${percent}%` }}
                                ></div>
                            </div>
                        </div>
                    </Card>
                );
            })}

            {/* Add Budget Card */}
            <Card className="p-6 flex flex-col items-center justify-center border-dashed border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-card-hover)] cursor-pointer transition-colors group">
                <div className="p-3 rounded-full bg-[var(--bg-card)] group-hover:bg-[var(--primary)]/20 transition-colors mb-3">
                    <Plus className="w-6 h-6 text-[var(--text-secondary)] group-hover:text-emerald-600 dark:group-hover:text-[var(--primary)]" />
                </div>
                <p className="font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Set Monthly Budget</p>
            </Card>
        </div>
    );
}
