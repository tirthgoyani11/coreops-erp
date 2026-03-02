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
            vendorCode: '',
            contactPerson: '',
            email: '',
            phone: '',
            address: '',
            gstNumber: '',
            panNumber: '',
            notes: ''
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
                                <label className="block text-sm font-medium mb-1">Vendor Code *</label>
                                <input
                                    {...register('vendorCode', { required: 'Vendor Code is required' })}
                                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                />
                                {errors.vendorCode && <span className="text-red-500 text-xs">{errors.vendorCode.message as string}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">GST Number</label>
                                <input
                                    {...register('gstNumber')}
                                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">PAN Number</label>
                                <input
                                    {...register('panNumber')}
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
                                    {...register('contactPerson')}
                                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    {...register('email')}
                                    type="email"
                                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Phone</label>
                                <input
                                    {...register('phone')}
                                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="col-span-1 md:col-span-2 space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Address</h3>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-medium mb-1">Full Address</label>
                                    <textarea
                                        {...register('address')}
                                        className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 h-24 resize-none"
                                        placeholder="Street, City, State, ZIP..."
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
