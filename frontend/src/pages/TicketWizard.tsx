import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../hooks/useToast';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';

export function TicketWizard() {
    const navigate = useNavigate();
    const toast = useToast();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        assetId: '',
        issueDescription: '',
        priority: 'medium',
        issueType: 'hardware_failure',
        estimatedCost: 0
    });

    useEffect(() => {
        // Fetch asset list for selection
        api.get('/assets').then(res => setAssets(res.data.data)).catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/maintenance', formData);
            toast.success('Maintenance ticket created successfully');
            navigate('/maintenance');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create ticket');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <Button variant="ghost" onClick={() => navigate('/maintenance')} className="mb-6 pl-0">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Maintenance
            </Button>

            <Card className="p-8">
                <h1 className="text-2xl font-bold mb-6">Create Maintenance Ticket</h1>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Asset Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Asset</label>
                        <Select
                            value={formData.assetId}
                            onValueChange={(val: string) => setFormData({ ...formData, assetId: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Search or select asset..." />
                            </SelectTrigger>
                            <SelectContent>
                                {assets.map((asset: any) => (
                                    <SelectItem key={asset.id} value={asset.id}>
                                        {asset.name} ({asset.serialNumber})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Issue Type */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Issue Type</label>
                            <Select
                                value={formData.issueType}
                                onValueChange={(val: string) => setFormData({ ...formData, issueType: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hardware_failure">Hardware Failure</SelectItem>
                                    <SelectItem value="software_issue">Software Issue</SelectItem>
                                    <SelectItem value="preventive">Preventive Maintenance</SelectItem>
                                    <SelectItem value="upgrade">Upgrade</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Priority</label>
                            <Select
                                value={formData.priority}
                                onValueChange={(val: string) => setFormData({ ...formData, priority: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Issue Description</label>
                        <textarea
                            className="flex min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-950 dark:border-gray-800"
                            placeholder="Describe the issue in detail..."
                            value={formData.issueDescription}
                            onChange={e => setFormData({ ...formData, issueDescription: e.target.value })}
                            required
                        />
                    </div>

                    {/* Estimated Cost (Optional for Algo) */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Estimated Repair Cost (₹) <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <Input
                            type="number"
                            min="0"
                            placeholder="0.00"
                            value={formData.estimatedCost}
                            onChange={e => setFormData({ ...formData, estimatedCost: Number(e.target.value) })}
                        />
                        <p className="text-xs text-gray-500">
                            Entering a cost &gt; 0 will trigger the "Repair vs Replace" algorithm recommendation.
                        </p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="outline" type="button" onClick={() => navigate('/maintenance')}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Ticket'}
                        </Button>
                    </div>

                </form>
            </Card>
        </div>
    );
}

// Export default for lazy loading routing usually
export default TicketWizard;
