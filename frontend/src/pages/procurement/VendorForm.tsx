import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Save } from 'lucide-react';

export function VendorForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            name: '',
            type: 'MANUFACTURER',
            contactPerson: { name: '', email: '', phone: '' },
            address: { street: '', city: '', state: '', zipCode: '', country: '' },
            paymentTerms: 'Net 30',
            taxId: ''
        }
    });

    useEffect(() => {
        if (isEditMode) {
            fetchVendor();
        }
    }, [id]);

    const fetchVendor = async () => {
        try {
            const res = await api.get(`/vendors/${id}`);
            reset(res.data.data);
        } catch (error) {
            console.error('Failed to fetch vendor:', error);
        }
    };

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            if (isEditMode) {
                await api.put(`/vendors/${id}`, data);
            } else {
                await api.post('/vendors', data);
            }
            navigate('/procurement/vendors');
        } catch (error) {
            console.error('Failed to save vendor:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/procurement/vendors')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {isEditMode ? 'Edit Vendor' : 'Add New Vendor'}
                </h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Card className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Basic Information</h3>

                            <div>
                                <label className="block text-sm font-medium mb-1">Company Name</label>
                                <input
                                    {...register('name', { required: 'Name is required' })}
                                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                />
                                {errors.name && <span className="text-red-500 text-xs">{errors.name.message as string}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Vendor Type</label>
                                <select {...register('type')} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                                    <option value="MANUFACTURER">Manufacturer</option>
                                    <option value="DISTRIBUTOR">Distributor</option>
                                    <option value="SERVICE_PROVIDER">Service Provider</option>
                                    <option value="CONTRACTOR">Contractor</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Payment Terms</label>
                                <select {...register('paymentTerms')} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                                    <option value="Net 30">Net 30</option>
                                    <option value="Net 60">Net 60</option>
                                    <option value="Immediate">Immediate / COD</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Tax ID / GSTIN</label>
                                <input
                                    {...register('taxId')}
                                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                        </div>

                        {/* Contact Person */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Contact Person</h3>

                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input
                                    {...register('contactPerson.name')}
                                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    {...register('contactPerson.email')}
                                    type="email"
                                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Phone</label>
                                <input
                                    {...register('contactPerson.phone')}
                                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="col-span-1 md:col-span-2 space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Address</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Street Address</label>
                                    <input
                                        {...register('address.street')}
                                        className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">City</label>
                                    <input
                                        {...register('address.city')}
                                        className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">State</label>
                                    <input
                                        {...register('address.state')}
                                        className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Zip Code</label>
                                    <input
                                        {...register('address.zipCode')}
                                        className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Country</label>
                                    <input
                                        {...register('address.country')}
                                        className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? 'Saving...' : 'Save Vendor'}
                        </Button>
                    </div>
                </Card>
            </form>
        </div>
    );
}
