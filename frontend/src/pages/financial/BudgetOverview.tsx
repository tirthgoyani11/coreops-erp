import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Plus } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/Select';

export function BudgetOverview() {
    const [budgets, setBudgets] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const [formData, setFormData] = useState({
        category: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        limit: ''
    });

    useEffect(() => {
        fetchBudgets();
    }, []);

    const fetchBudgets = async () => {
        try {
            const res = await api.get('/finance/budgets');
            setBudgets(res.data.data);
        } catch (error) {
            console.error('Failed to fetch budgets:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/finance/budgets', {
                category: formData.category,
                month: Number(formData.month),
                year: Number(formData.year),
                limit: Number(formData.limit)
            });
            toast.success('Budget set successfully');
            setIsModalOpen(false);
            setFormData({
                category: '',
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                limit: ''
            });
            fetchBudgets();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to set budget');
        } finally {
            setLoading(false);
        }
    };

    const categories = [
        'Marketing', 'IT & Software', 'Office Supplies', 'Travel', 'Maintenance', 'Salaries', 'Other'
    ];

    const months = [
        { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
        { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
        { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
        { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {budgets.map((budget: any) => {
                const percent = budget.limit > 0 ? Math.min((budget.spent / budget.limit) * 100, 100) : 0;
                const color = percent > 90 ? 'bg-red-500' : percent > 75 ? 'bg-yellow-500' : 'bg-green-500';

                return (
                    <Card key={budget.id} className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{budget.category}</h3>
                                <p className="text-xs text-gray-500">{new Date(0, budget.month - 1).toLocaleString('default', { month: 'long' })} {budget.year}</p>
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                ₹{budget.limit.toLocaleString()}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span>Spent: ₹{budget.spent.toLocaleString()}</span>
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
            <Card
                className="p-6 flex flex-col items-center justify-center border-dashed border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-card-hover)] cursor-pointer transition-colors group"
                onClick={() => setIsModalOpen(true)}
            >
                <div className="p-3 rounded-full bg-[var(--bg-card)] group-hover:bg-[var(--primary)]/20 transition-colors mb-3">
                    <Plus className="w-6 h-6 text-[var(--text-secondary)] group-hover:text-emerald-600 dark:group-hover:text-[var(--primary)]" />
                </div>
                <p className="font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Set Monthly Budget</p>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Monthly Budget</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(val: any) => setFormData({ ...formData, category: val })}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Month</Label>
                                <Select
                                    value={formData.month.toString()}
                                    onValueChange={(val: any) => setFormData({ ...formData, month: parseInt(val) })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map((m) => (
                                            <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Year</Label>
                                <Input
                                    type="number"
                                    min={2020}
                                    max={2100}
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Budget Limit (₹)</Label>
                            <Input
                                type="number"
                                min={0}
                                step={1000}
                                value={formData.limit}
                                onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                                required
                                placeholder="e.g. 50000"
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading || !formData.category || !formData.limit}>
                                {loading ? 'Saving...' : 'Save Budget'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
