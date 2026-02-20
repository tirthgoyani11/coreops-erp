import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    Plus,
    Search,
    Filter,
    Star,
    Truck
} from 'lucide-react';

export function VendorList() {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            const res = await api.get('/vendors');
            setVendors(res.data.data);
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
        } finally {
            setLoading(false);
        }
    };

    const getReliabilityColor = (score: number) => {
        if (score >= 90) return 'text-green-600 bg-green-100';
        if (score >= 75) return 'text-blue-600 bg-blue-100';
        if (score >= 50) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const filteredVendors = vendors.filter((v: any) =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.vendorCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Vendor Management</h1>
                    <p className="text-sm text-gray-500">Manage suppliers and track performance</p>
                </div>
                <Button onClick={() => navigate('/procurement/vendors/new')} className="bg-[var(--primary)] text-black hover:bg-[var(--primary)]/90 border-none shadow-[0_0_15px_var(--primary-glow)]">
                    <Plus className="w-4 h-4 mr-2" /> Add Vendor
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" /> Filter
                </Button>
            </div>

            {/* Vendor Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredVendors.map((vendor: any) => (
                    <Card key={vendor._id} className="p-5 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/procurement/vendors/${vendor._id}`)}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-600 dark:text-gray-300">
                                    {vendor.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{vendor.name}</h3>
                                    <p className="text-xs text-gray-500">{vendor.vendorCode}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${vendor.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {vendor.type}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div className="space-y-1">
                                <p className="text-gray-500 text-xs">Contact</p>
                                <p className="font-medium truncate">{vendor.contactPerson?.name || 'N/A'}</p>
                                <p className="text-gray-400 text-xs truncate">{vendor.contactPerson?.email}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-gray-500 text-xs">Payment Terms</p>
                                <p className="font-medium">{vendor.paymentTerms}</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="text-sm font-bold">{vendor.performanceMetrics?.qualityRating || 0}/5</span>
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${getReliabilityColor(vendor.performanceMetrics?.onTimeDeliveries || 0)}`}>
                                <Truck className="w-3 h-3" />
                                {vendor.performanceMetrics?.onTimeDeliveries || 0}% On-Time
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {filteredVendors.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">
                    No vendors found. Add one to get started.
                </div>
            )}
        </div>
    );
}
