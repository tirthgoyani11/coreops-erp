import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Shield,
    Search,
    Filter,
    Calendar,
    User,
    Activity,
    AlertCircle,
    CheckCircle,
    XCircle,
    Download,
    ChevronLeft,
    ChevronRight,
    Eye,
    FileSpreadsheet,
} from 'lucide-react';
import api from '../lib/api';
import { exportAuditLogs } from '../utils/exportUtils';

interface AuditLog {
    _id: string;
    user?: {
        _id: string;
        name: string;
        email: string;
        role: string;
    };
    action: string;
    resourceType: string;
    resourceId?: string;
    changes?: {
        before?: Record<string, unknown>;
        after?: Record<string, unknown>;
    };
    ipAddress?: string;
    userAgent?: string;
    status: 'success' | 'failure' | 'error';
    errorMessage?: string;
    timestamp: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

const AuditLogs = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 50,
        total: 0,
        pages: 0,
    });
    const [filters, setFilters] = useState({
        action: '',
        resourceType: '',
        status: '',
        startDate: '',
        endDate: '',
    });
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('page', pagination.page.toString());
            params.append('limit', pagination.limit.toString());

            if (filters.action) params.append('action', filters.action);
            if (filters.resourceType) params.append('resourceType', filters.resourceType);
            if (filters.status) params.append('status', filters.status);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const response = await api.get(`/audit-logs?${params.toString()}`);
            setLogs(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                ...response.data.pagination,
            }));
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [pagination.page, filters]);

    const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
        exportAuditLogs(logs as unknown as Record<string, unknown>[], format);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failure':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'error':
                return <AlertCircle className="w-4 h-4 text-orange-500" />;
            default:
                return <Activity className="w-4 h-4 text-gray-500" />;
        }
    };

    const getActionBadgeClass = (action: string) => {
        if (action.includes('create') || action.includes('register')) {
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        }
        if (action.includes('update') || action.includes('edit')) {
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        }
        if (action.includes('delete') || action.includes('remove')) {
            return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        }
        if (action.includes('login') || action.includes('logout')) {
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
        }
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return {
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString(),
        };
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Shield className="w-6 h-6 text-purple-600" />
                        Audit Logs
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Security and activity monitoring
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card-hover)] flex items-center gap-2 text-[var(--text-secondary)]"
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>
                    <button
                        onClick={() => handleExport('pdf')}
                        className="px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card-hover)] flex items-center gap-2 text-[var(--text-secondary)]"
                    >
                        <Download className="w-4 h-4" />
                        PDF
                    </button>
                    <button
                        onClick={() => handleExport('csv')}
                        className="px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card-hover)] flex items-center gap-2 text-[var(--text-secondary)]"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        CSV
                    </button>
                    <button
                        onClick={() => handleExport('excel')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Excel
                    </button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]"
                >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                Action
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search action..."
                                    value={filters.action}
                                    onChange={(e) => setFilters(f => ({ ...f, action: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Resource Type
                            </label>
                            <select
                                value={filters.resourceType}
                                onChange={(e) => setFilters(f => ({ ...f, resourceType: e.target.value }))}
                                className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                            >
                                <option value="">All</option>
                                <option value="User">User</option>
                                <option value="Asset">Asset</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Inventory">Inventory</option>
                                <option value="PurchaseOrder">Purchase Order</option>
                                <option value="Vendor">Vendor</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Status
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                            >
                                <option value="">All</option>
                                <option value="success">Success</option>
                                <option value="failure">Failure</option>
                                <option value="error">Error</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Start Date
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                End Date
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Logs Table */}
            <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[var(--bg-card-hover)]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                    Timestamp
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Action
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Resource
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    IP Address
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                        No audit logs found
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const { date, time } = formatTime(log.timestamp);
                                    return (
                                        <tr key={log._id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-[var(--text-primary)]">
                                                    {date}
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)]">
                                                    {time}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    <div>
                                                        <div className="text-sm font-medium text-[var(--text-primary)]">
                                                            {log.user?.name || 'System'}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            {log.user?.email || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getActionBadgeClass(log.action)}`}>
                                                    {log.action.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                                                {log.resourceType || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    {getStatusIcon(log.status)}
                                                    <span className="text-sm capitalize">{log.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)] font-mono">
                                                {log.ipAddress || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => setSelectedLog(log)}
                                                    className="p-1.5 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                                >
                                                    <Eye className="w-4 h-4 text-gray-500" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-[var(--border-color)] flex items-center justify-between">
                    <div className="text-sm text-[var(--text-muted)]">
                        Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                        {pagination.total} entries
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                            disabled={pagination.page === 1}
                            className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-secondary)]"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-[var(--text-secondary)]">
                            Page {pagination.page} of {pagination.pages}
                        </span>
                        <button
                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                            disabled={pagination.page >= pagination.pages}
                            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-[var(--bg-card)] rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto text-[var(--text-primary)]"
                    >
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                Audit Log Details
                            </h2>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-secondary)]"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-[var(--text-muted)]">Timestamp</label>
                                    <p className="font-medium">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400">User</label>
                                    <p className="font-medium">{selectedLog.user?.name || 'System'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400">Action</label>
                                    <p className="font-medium">{selectedLog.action}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400">Resource</label>
                                    <p className="font-medium">{selectedLog.resourceType}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400">IP Address</label>
                                    <p className="font-mono">{selectedLog.ipAddress || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-[var(--text-muted)]">Status</label>
                                    <div className="flex items-center gap-1.5">
                                        {getStatusIcon(selectedLog.status)}
                                        <span className="capitalize">{selectedLog.status}</span>
                                    </div>
                                </div>
                            </div>
                            {selectedLog.changes && (
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400">Changes</label>
                                    <pre className="mt-2 p-4 bg-[var(--bg-background)] rounded-lg overflow-x-auto text-sm border border-[var(--border-color)] text-[var(--text-secondary)]">
                                        {JSON.stringify(selectedLog.changes, null, 2)}
                                    </pre>
                                </div>
                            )}
                            {selectedLog.errorMessage && (
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400">Error Message</label>
                                    <p className="text-red-600 dark:text-red-400 mt-1">{selectedLog.errorMessage}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
