import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Plus, Loader2, CheckCircle2, XCircle, DollarSign, List, FileText, ScanLine } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

export function ExpenseClaims() {
    const [claims, setClaims] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [userRole, setUserRole] = useState<string>('STAFF');
    const [isOcrScanning, setIsOcrScanning] = useState(false);
    const [ocrMessage, setOcrMessage] = useState<string>('');

    // Form State
    const [description, setDescription] = useState('');
    const [items, setItems] = useState<any[]>([
        { date: new Date().toISOString().split('T')[0], category: 'TRAVEL', description: '', amount: '' }
    ]);

    useEffect(() => {
        // Simple way to get user role from localStorage, standard in this app
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUserRole(JSON.parse(storedUser).role);
        }
        fetchClaims();
    }, []);

    const fetchClaims = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/finance-ext/expense-claims');
            if (res.data.success) {
                setClaims(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch expense claims:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddItem = () => {
        setItems([...items, { date: new Date().toISOString().split('T')[0], category: 'TRAVEL', description: '', amount: '' }]);
    };

    const handleUpdateItem = (index: number, field: string, value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleScanReceipt = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsOcrScanning(true);
            setOcrMessage('Scanning receipt with OCR...');

            const formData = new FormData();
            formData.append('invoice', file);
            formData.append('ocrMode', 'high');

            const res = await api.post('/ocr/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const extracted = res?.data?.data?.extractedData || {};
            const aiSource = res?.data?.data?.aiSource || 'unknown';
            const ocrMode = res?.data?.data?.ocrMode || 'high';
            const lineItems = Array.isArray(extracted.lineItems) ? extracted.lineItems : [];

            if (extracted.vendorName || extracted.invoiceNumber || extracted.notes) {
                const autoDescription = [
                    extracted.vendorName ? `Vendor: ${extracted.vendorName}` : '',
                    extracted.invoiceNumber ? `Invoice: ${extracted.invoiceNumber}` : '',
                    extracted.notes || '',
                ].filter(Boolean).join(' | ');

                setDescription(autoDescription || description);
            }

            if (lineItems.length > 0) {
                const mappedItems = lineItems.slice(0, 20).map((line: any) => ({
                    date: extracted.date || new Date().toISOString().split('T')[0],
                    category: 'SUPPLIES',
                    description: String(line.description || 'OCR Imported Item').slice(0, 200),
                    amount: String(Number(line.total || line.unitPrice || 0) || ''),
                }));
                setItems(mappedItems.length > 0 ? mappedItems : items);
                setOcrMessage(`OCR (${ocrMode}, ${aiSource}) complete. Imported ${mappedItems.length} expense item(s).`);
            } else if (extracted.totalAmount) {
                setItems([
                    {
                        date: extracted.date || new Date().toISOString().split('T')[0],
                        category: 'SUPPLIES',
                        description: extracted.vendorName ? `Receipt from ${extracted.vendorName}` : 'OCR imported receipt',
                        amount: String(Number(extracted.totalAmount)),
                    },
                ]);
                setOcrMessage(`OCR (${ocrMode}, ${aiSource}) complete. Total amount imported as one expense item.`);
            } else {
                setOcrMessage(`OCR (${ocrMode}, ${aiSource}) complete, but no amount was detected. Please fill values manually.`);
            }
        } catch (error: any) {
            console.error('OCR scan failed:', error);
            setOcrMessage(error?.response?.data?.message || 'OCR scan failed. Try another image.');
        } finally {
            setIsOcrScanning(false);
            event.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            // Validation
            if (items.some(i => !i.description || !i.amount || isNaN(Number(i.amount)))) {
                alert('Please fill out all item details correctly.');
                return;
            }

            const payload = {
                description,
                items: items.map(i => ({ ...i, amount: Number(i.amount) }))
            };

            const res = await api.post('/finance-ext/expense-claims', payload);
            if (res.data.success) {
                setShowForm(false);
                setDescription('');
                setItems([{ date: new Date().toISOString().split('T')[0], category: 'TRAVEL', description: '', amount: '' }]);
                fetchClaims();
            }
        } catch (error) {
            console.error('Submit failed', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAction = async (id: string, action: 'APPROVED' | 'REJECTED' | 'PAY') => {
        try {
            if (action === 'PAY') {
                await api.put(`/finance-ext/expense-claims/${id}/pay`);
            } else {
                await api.put(`/finance-ext/expense-claims/${id}/status`, { status: action });
            }
            fetchClaims();
        } catch (error) {
            console.error(`Action ${action} failed:`, error);
        }
    };



    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SUBMITTED': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'APPROVED': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'REJECTED': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'PAID': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const canApprove = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-color)]">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <Receipt className="w-6 h-6 text-orange-400" />
                        Expense Claims
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Submit and track employee reimbursement claims.
                    </p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-black rounded-lg hover:shadow-[0_0_15px_rgba(185,255,102,0.4)] transition-all font-medium"
                    >
                        <Plus className="w-5 h-5" /> New Claim
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {showForm ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 shadow-lg"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Submit New Expense Claim</h2>
                            <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <h3 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                                            <ScanLine className="w-4 h-4 text-[var(--primary)]" /> OCR Receipt Scanner
                                        </h3>
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">Upload receipt/invoice image to auto-fill claim fields.</p>
                                    </div>
                                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-card)] text-sm">
                                        {isOcrScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                                        {isOcrScanning ? 'Scanning...' : 'Scan Receipt'}
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={handleScanReceipt}
                                            className="hidden"
                                            disabled={isOcrScanning}
                                        />
                                    </label>
                                </div>
                                {ocrMessage && <p className="mt-2 text-xs text-[var(--text-secondary)]">{ocrMessage}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Purpose / Description</label>
                                <input
                                    type="text"
                                    required
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Client visit to Mumbai"
                                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-medium text-[var(--text-primary)]">Expense Items</h3>
                                    <button type="button" onClick={handleAddItem} className="text-sm text-[var(--primary)] hover:underline flex items-center gap-1">
                                        <Plus className="w-4 h-4" /> Add Row
                                    </button>
                                </div>
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 items-start bg-[var(--bg-overlay)] p-3 rounded-lg border border-[var(--border-color)]">
                                        <div className="flex-1 space-y-3">
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Date</label>
                                                    <input type="date" required value={item.date} onChange={(e) => handleUpdateItem(idx, 'date', e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded p-2 text-sm text-[var(--text-primary)]" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Category</label>
                                                    <select required value={item.category} onChange={(e) => handleUpdateItem(idx, 'category', e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded p-2 text-sm text-[var(--text-primary)]">
                                                        <option value="TRAVEL">Travel</option>
                                                        <option value="FOOD">Food</option>
                                                        <option value="ACCOMMODATION">Accommodation</option>
                                                        <option value="SUPPLIES">Supplies</option>
                                                        <option value="OTHER">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Amount (INR)</label>
                                                    <input type="number" min="1" step="0.01" required value={item.amount} onChange={(e) => handleUpdateItem(idx, 'amount', e.target.value)} placeholder="0.00" className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded p-2 text-sm text-[var(--text-primary)]" />
                                                </div>
                                            </div>
                                            <div>
                                                <input type="text" required value={item.description} onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)} placeholder="Description of expense..." className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded p-2 text-sm text-[var(--text-primary)]" />
                                            </div>
                                        </div>
                                        {items.length > 1 && (
                                            <button type="button" onClick={() => handleRemoveItem(idx)} className="mt-6 text-red-400 hover:text-red-300">
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end pt-4 border-t border-[var(--border-color)]">
                                <div className="text-right mr-6">
                                    <div className="text-sm text-[var(--text-secondary)]">Total Claim Amount</div>
                                    <div className="text-2xl font-black text-[var(--primary)]">
                                        {formatCurrency(items.reduce((s, i) => s + (Number(i.amount) || 0), 0))}
                                    </div>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-black rounded-xl font-bold hover:shadow-[0_0_15px_rgba(185,255,102,0.4)] disabled:opacity-50 transition-all">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                    Submit Claim
                                </button>
                            </div>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {isLoading ? (
                            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
                        ) : claims.length === 0 ? (
                            <div className="text-center py-16 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
                                <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-[var(--text-primary)]">No Expense Claims Found</h3>
                                <p className="text-[var(--text-secondary)] mt-2">You haven't submitted any expense claims yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {claims.map(claim => (
                                    <div key={claim.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 hover:border-[var(--primary)]/50 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{claim.claimNumber}</h3>
                                                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded border ${getStatusColor(claim.status)}`}>
                                                        {claim.status}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-[var(--text-secondary)] mt-1">
                                                    By <span className="text-[var(--text-primary)] font-medium">{claim.employee?.name}</span> • {new Date(claim.createdAt).toLocaleDateString()}
                                                </div>
                                                <div className="text-[var(--text-primary)] mt-2">{claim.description}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-[var(--text-primary)]">{formatCurrency(claim.totalAmount)}</div>
                                                <div className="text-xs text-[var(--text-muted)] uppercase mt-1">{claim.items.length} items</div>
                                            </div>
                                        </div>

                                        <div className="bg-[var(--bg-overlay)] rounded-lg p-3 border border-[var(--border-color)]">
                                            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-[var(--text-secondary)]">
                                                <List className="w-4 h-4" /> Item Breakdown
                                            </div>
                                            <div className="divide-y divide-[var(--border-color)]/50">
                                                {claim.items.map((item: any) => (
                                                    <div key={item.id} className="py-2 flex justify-between items-center text-sm">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[var(--text-muted)] w-20">{new Date(item.date).toLocaleDateString()}</span>
                                                            <span className="px-2 py-0.5 bg-[var(--bg-card)] rounded text-[var(--text-secondary)] text-xs border border-[var(--border-color)]">
                                                                {item.category}
                                                            </span>
                                                            <span className="text-[var(--text-primary)]">{item.description}</span>
                                                        </div>
                                                        <div className="font-medium text-[var(--text-primary)]">{formatCurrency(item.amount)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {canApprove && (
                                            <div className="mt-4 flex gap-3 justify-end pt-4 border-t border-[var(--border-color)]">
                                                {claim.status === 'SUBMITTED' && (
                                                    <>
                                                        <button onClick={() => handleAction(claim.id, 'REJECTED')} className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors">
                                                            Reject
                                                        </button>
                                                        <button onClick={() => handleAction(claim.id, 'APPROVED')} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-all">
                                                            <CheckCircle2 className="w-4 h-4" /> Approve
                                                        </button>
                                                    </>
                                                )}
                                                {claim.status === 'APPROVED' && (
                                                    <button onClick={() => handleAction(claim.id, 'PAY')} className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-black rounded-lg text-sm font-semibold hover:shadow-[0_0_15px_rgba(185,255,102,0.4)] transition-all">
                                                        <DollarSign className="w-4 h-4" /> Mark as Paid
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
