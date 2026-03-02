import { MapPin, Building, LandPlot, User } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useState, useEffect } from 'react';
import api from '../../../lib/api';

interface StepLocationProps {
    data: any;
    updateData: (data: any) => void;
    errors: any;
}

export function StepLocation({ data, updateData, errors }: StepLocationProps) {
    const [offices, setOffices] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        // Fetch offices for dropdown
        const fetchOffices = async () => {
            try {
                const res = await api.get('/offices');
                const officeData = Array.isArray(res.data) ? res.data : (res.data.data || []);
                setOffices(officeData);
            } catch (e) {
                console.error("Failed to fetch offices", e);
            }
        }
        fetchOffices();

        // Fetch users for assignment dropdown
        const fetchUsers = async () => {
            try {
                const res = await api.get('/assets/users');
                setUsers(res.data.data || []);
            } catch (e) {
                console.error("Failed to fetch users", e);
            }
        }
        fetchUsers();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        updateData({ [e.target.name]: e.target.value });
    };

    return (
        <div className="space-y-6">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 mb-6 flex items-start gap-4">
                <div className="bg-blue-500/10 p-3 rounded-xl text-blue-400">
                    <MapPin size={24} />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">Location Tracking</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Assigning the correct location ensures accurate asset auditing and helps field technicians locate equipment quickly.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Organization/Office */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Office / Branch *</label>
                    <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                        <select
                            name="officeId"
                            value={data.officeId}
                            onChange={handleChange}
                            className={cn(
                                "w-full pl-10 pr-4 py-3 bg-[var(--bg-background)] border rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] appearance-none cursor-pointer",
                                errors.officeId ? "border-red-500/50" : "border-[var(--border-color)]"
                            )}
                        >
                            <option value="">Select Office</option>
                            {offices.map(office => (
                                <option key={office.id} value={office.id}>{office.name} ({office.code})</option>
                            ))}
                            {/* Fallback if no offices loaded yet */}
                            {!offices.length && <option value="" disabled>Loading offices...</option>}
                        </select>
                    </div>
                    {errors.officeId && <p className="text-xs text-red-400">{errors.officeId}</p>}
                </div>

                {/* Building */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Building</label>
                    <div className="relative">
                        <LandPlot className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                        <input
                            type="text"
                            name="building"
                            value={data.building}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                            placeholder="e.g. Building A"
                        />
                    </div>
                </div>

                {/* Floor */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Floor</label>
                    <input
                        type="text"
                        name="floor"
                        value={data.floor}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                        placeholder="e.g. 2nd Floor"
                    />
                </div>

                {/* Room */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Room / Area</label>
                    <input
                        type="text"
                        name="room"
                        value={data.room}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                        placeholder="e.g. Server Room 101"
                    />
                </div>

                {/* Assign To User */}
                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Assign To (Optional)</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                        <select
                            name="assignedTo"
                            value={data.assignedTo || ''}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] appearance-none cursor-pointer"
                        >
                            <option value="">No assignment</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                            ))}
                        </select>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">You can also check-out the asset later from the detail page.</p>
                </div>
            </div>
        </div>
    );
}
