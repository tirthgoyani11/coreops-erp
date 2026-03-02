import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    BarChart3,
    Clock,
    Package,
    Edit
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

export function VendorDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [vendor, setVendor] = useState<any>(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [vendorRes, poRes] = await Promise.all([
                    api.get(`/vendors/${id}`),
                    api.get(`/purchase-orders?vendorId=${id}`)
                ]);
                setVendor(vendorRes.data.data);
                setOrders(poRes.data.data);
            } catch (error) {
                console.error('Error fetching details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div>Loading...</div>;
    if (!vendor) return <div>Vendor not found</div>;

    // Mock trend data
    const trendData = [
        { month: 'Jan', score: 85 },
        { month: 'Feb', score: 88 },
        { month: 'Mar', score: 92 },
        { month: 'Apr', score: 90 },
    ];

    return (
        <div className="space-y-6">
            <Button variant="ghost" className="pl-0" onClick={() => navigate('/procurement/vendors')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Vendors
            </Button>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                        {vendor.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{vendor.name}</h1>
                        <div className="flex items-center gap-2 text-gray-500 mt-1">
                            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-sm">{vendor.vendorCode}</span>
                        </div>
                    </div>
                </div>
                <Button variant="outline" onClick={() => navigate(`/vendors/${id}/edit`)}>
                    <Edit className="w-4 h-4 mr-2" /> Edit Vendor
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Contact Info */}
                <Card className="p-6 space-y-4">
                    <h3 className="font-semibold text-lg">Contact Information</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline">
                                {vendor.email || 'N/A'}
                            </a>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{vendor.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                            <span className="whitespace-pre-wrap">
                                {vendor.address || 'N/A'}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Performance Stats */}
                <Card className="p-6 md:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Performance Analytics</h3>
                        <span className="text-sm text-gray-500">Last 12 Months</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="text-sm text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                                <Clock className="w-4 h-4" /> On-Time Delivery
                            </div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                                {vendor.reliabilityMetrics?.deliveryScore || 0}%
                            </div>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="text-sm text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                                <BarChart3 className="w-4 h-4" /> Quality Rating
                            </div>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                {((vendor.reliabilityMetrics?.overallScore || 0) / 20).toFixed(1)}/5
                            </div>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <div className="text-sm text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1">
                                <Package className="w-4 h-4" /> Total Orders
                            </div>
                            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                {vendor.purchaseOrders?.length || 0}
                            </div>
                        </div>
                    </div>

                    <div className="h-48 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                                <YAxis hide />
                                <Tooltip />
                                <Line type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* PO History */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Purchase Order History</h3>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/procurement/orders?vendorId=${id}`)}>View All</Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-gray-500 border-b">
                            <tr>
                                <th className="text-left pb-3 pl-4">PO Number</th>
                                <th className="text-left pb-3">Date</th>
                                <th className="text-left pb-3">Status</th>
                                <th className="text-right pb-3 pr-4">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {orders.map((po: any) => (
                                <tr key={po.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate(`/procurement/orders/${po.id}`)}>
                                    <td className="py-3 pl-4 font-medium text-blue-600">{po.poNumber}</td>
                                    <td className="py-3 text-gray-500">{new Date(po.createdAt).toLocaleDateString()}</td>
                                    <td className="py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                            ${po.status === 'RECEIVED' ? 'bg-green-100 text-green-700' :
                                                po.status === 'ORDERED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {po.status}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4 text-right font-medium">₹{po.totalAmount?.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {orders.length === 0 && <p className="text-center py-6 text-gray-500">No purchase orders found.</p>}
                </div>
            </Card>
        </div>
    );
}
