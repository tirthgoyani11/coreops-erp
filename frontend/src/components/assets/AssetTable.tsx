import React, { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper,
    type SortingState,
} from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import {
    ArrowUpDown,
    Edit,
    Repeat,
    CheckCircle,
    AlertTriangle,
    XCircle,
    HelpCircle,
    Wrench,
    Trash2,
    Check,
    Minus
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';

interface AssetTableProps {
    data: any[];
    loading?: boolean;
    onAssetClick?: (assetId: string) => void;
    onBulkDelete?: (ids: string[]) => void;
    onRefresh?: () => void;
}

const columnHelper = createColumnHelper<any>();

export function AssetTable({ data, loading, onAssetClick, onBulkDelete, onRefresh }: AssetTableProps) {
    const navigate = useNavigate();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState({});
    const [statusModal, setStatusModal] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
    const [transferModal, setTransferModal] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });

    // Helper: Get selected asset IDs from rowSelection indices
    const getSelectedIds = (): string[] => {
        return Object.keys(rowSelection)
            .map(index => data[parseInt(index)]?.id)
            .filter(Boolean);
    };

    const columns = useMemo(() => [
        {
            id: 'select',
            header: ({ table }: any) => (
                <div className="w-10 px-1 flex items-center justify-center">
                    <IndeterminateCheckbox
                        {...{
                            checked: table.getIsAllRowsSelected(),
                            indeterminate: table.getIsSomeRowsSelected(),
                            onChange: table.getToggleAllRowsSelectedHandler(),
                        }}
                    />
                </div>
            ),
            cell: ({ row }: any) => (
                <div className="w-10 px-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <IndeterminateCheckbox
                        {...{
                            checked: row.getIsSelected(),
                            disabled: !row.getCanSelect(),
                            indeterminate: row.getIsSomeSelected(),
                            onChange: row.getToggleSelectedHandler(),
                        }}
                    />
                </div>
            ),
        },
        columnHelper.accessor('guai', {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-[var(--primary)] transition-colors"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    GUAI
                    <ArrowUpDown size={14} className="opacity-50" />
                </button>
            ),
            cell: info => (
                <span className="font-mono text-[var(--primary)] font-medium text-xs md:text-sm">
                    {info.getValue()}
                </span>
            ),
        }),
        columnHelper.accessor('name', {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-[var(--primary)] transition-colors"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Asset Name
                    <ArrowUpDown size={14} className="opacity-50" />
                </button>
            ),
            cell: info => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-card-hover)] flex items-center justify-center text-[var(--text-secondary)] border border-[var(--border-color)]">
                        {info.row.original.name.charAt(0)}
                    </div>
                    <span className="font-medium text-[var(--text-primary)]">{info.getValue()}</span>
                </div>
            ),
        }),
        columnHelper.accessor('category', {
            header: 'Category',
            cell: info => (
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-[var(--bg-card-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                    {info.getValue()}
                </span>
            ),
        }),
        columnHelper.accessor('building', {
            header: 'Location',
            cell: info => {
                return (
                    <div className="text-xs text-[var(--text-secondary)]">
                        <span className='block text-[var(--text-primary)]'>{info.row.original.office?.name || 'N/A'}</span>
                        <span className='opacity-70'>{info.row.original.room || info.row.original.floor || '-'}</span>
                    </div>
                );
            }
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: info => {
                const status = info.getValue();
                return <StatusBadge status={status} />;
            },
        }),
        columnHelper.display({
            id: 'actions',
            cell: info => (
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/assets/${info.row.original.id}/edit`); }}
                        className="p-1.5 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                        title="Edit Asset"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setTransferModal({ open: true, ids: [info.row.original.id] });
                        }}
                        className="p-1.5 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-secondary)] hover:text-blue-400 transition-colors"
                        title="Transfer Asset"
                    >
                        <Repeat size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setStatusModal({ open: true, ids: [info.row.original.id] });
                        }}
                        className="p-1.5 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-secondary)] hover:text-amber-400 transition-colors"
                        title="Update Status"
                    >
                        <Wrench size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onBulkDelete) onBulkDelete([info.row.original.id]);
                        }}
                        className="p-1.5 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                        title="Delete Asset"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ),
        }),
    ], [navigate, onBulkDelete]);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            rowSelection,
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const selectedCount = Object.keys(rowSelection).length;

    // Handler: Bulk Status Update
    const handleBulkStatusUpdate = async (newStatus: string) => {
        const ids = statusModal.ids;
        if (!ids.length) return;

        try {
            await Promise.all(ids.map(id => api.patch(`/assets/${id}`, { status: newStatus })));
            setStatusModal({ open: false, ids: [] });
            setRowSelection({});
            onRefresh?.();
        } catch (error) {
            console.error('Failed to update status', error);
            alert('Failed to update status for some assets.');
        }
    };

    // Handler: Bulk Transfer
    const handleBulkTransfer = async (locationBuilding: string, locationFloor: string, locationRoom: string) => {
        const ids = transferModal.ids;
        if (!ids.length) return;

        try {
            await Promise.all(ids.map(id => api.patch(`/assets/${id}`, { locationBuilding, locationFloor, locationRoom })));
            setTransferModal({ open: false, ids: [] });
            setRowSelection({});
            onRefresh?.();
        } catch (error) {
            console.error('Failed to transfer assets', error);
            alert('Failed to transfer some assets.');
        }
    };

    if (loading) {
        return (
            <div className="relative w-full overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                <div className="p-8 space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 w-full bg-[var(--bg-card-hover)] animate-pulse rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)] bg-[var(--bg-card)] rounded-3xl border border-dashed border-[var(--border-color)]">
                <AlertTriangle size={48} className="mb-4 opacity-50 text-amber-500" />
                <p className="text-lg font-medium text-[var(--text-primary)]">No assets found</p>
                <p className="text-sm">Try adjusting your filters or add a new asset.</p>
            </div>
        );
    }

    return (
        <div className="relative w-full">
            <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl shadow-black/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id} className="border-b border-[var(--border-color)] bg-[var(--bg-card-hover)]/50">
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="p-4 font-medium text-[var(--text-secondary)] whitespace-nowrap">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map(row => (
                                <motion.tr
                                    key={row.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={() => {
                                        if (onAssetClick) {
                                            onAssetClick(row.original.id);
                                        } else {
                                            navigate(`/assets/${row.original.id}`);
                                        }
                                    }}
                                    className={cn(
                                        "group border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-all cursor-pointer relative",
                                        row.getIsSelected()
                                            ? "bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 shadow-[inset_3px_0_0_var(--primary)]"
                                            : "hover:shadow-[inset_3px_0_0_var(--primary)]"
                                    )}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="p-4">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between p-4 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="text-xs text-[var(--text-secondary)]">
                        Showing <span className="font-medium text-[var(--text-primary)]">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span> to <span className="font-medium text-[var(--text-primary)]">{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)}</span> of <span className="font-medium text-[var(--text-primary)]">{data.length}</span> results
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-medium hover:bg-[var(--bg-card-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </button>
                        <button
                            className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-medium hover:bg-[var(--bg-card-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating Bulk Action Bar */}
            <AnimatePresence>
                {selectedCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 p-2 pr-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl shadow-black/20"
                    >
                        <div className="flex items-center gap-3 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-card)] rounded-xl font-bold">
                            <span className="bg-[var(--primary)] text-black w-6 h-6 flex items-center justify-center rounded-full text-xs">
                                {selectedCount}
                            </span>
                            Selected
                        </div>
                        <div className="h-8 w-px bg-[var(--border-color)]" />

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const ids = getSelectedIds();
                                    if (ids.length > 0 && onBulkDelete) {
                                        onBulkDelete(ids);
                                        setRowSelection({});
                                    }
                                }}
                                className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                                title="Delete Selected"
                            >
                                <Trash2 size={20} />
                            </button>
                            <button
                                onClick={() => {
                                    const ids = getSelectedIds();
                                    if (ids.length > 0) {
                                        setTransferModal({ open: true, ids });
                                    }
                                }}
                                className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-secondary)] hover:text-blue-400 transition-colors"
                                title="Transfer Selected"
                            >
                                <Repeat size={20} />
                            </button>
                            <button
                                onClick={() => {
                                    const ids = getSelectedIds();
                                    if (ids.length > 0) {
                                        setStatusModal({ open: true, ids });
                                    }
                                }}
                                className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-secondary)] hover:text-amber-500 transition-colors"
                                title="Update Status"
                            >
                                <Wrench size={20} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Status Update Modal */}
            <AnimatePresence>
                {statusModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setStatusModal({ open: false, ids: [] })}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                        >
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Update Status</h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-5">
                                Change status for {statusModal.ids.length} asset{statusModal.ids.length > 1 ? 's' : ''}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {['ACTIVE', 'MAINTENANCE', 'RETIRED', 'LOST'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => handleBulkStatusUpdate(status)}
                                        className={cn(
                                            "px-4 py-3 rounded-xl border font-medium text-sm transition-all hover:scale-[1.02]",
                                            status === 'ACTIVE' && "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20",
                                            status === 'MAINTENANCE' && "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
                                            status === 'RETIRED' && "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20",
                                            status === 'LOST' && "border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20",
                                        )}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setStatusModal({ open: false, ids: [] })}
                                className="mt-4 w-full py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Transfer Modal */}
            <AnimatePresence>
                {transferModal.open && (
                    <TransferModal
                        ids={transferModal.ids}
                        onClose={() => setTransferModal({ open: false, ids: [] })}
                        onTransfer={handleBulkTransfer}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Transfer Modal Component
function TransferModal({ ids, onClose, onTransfer }: { ids: string[]; onClose: () => void; onTransfer: (b: string, f: string, r: string) => void }) {
    const [building, setBuilding] = useState('');
    const [floor, setFloor] = useState('');
    const [room, setRoom] = useState('');

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Transfer Assets</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-5">
                    Move {ids.length} asset{ids.length > 1 ? 's' : ''} to a new location
                </p>
                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="Building"
                        value={building}
                        onChange={(e) => setBuilding(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-background)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                    />
                    <input
                        type="text"
                        placeholder="Floor"
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-background)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                    />
                    <input
                        type="text"
                        placeholder="Room"
                        value={room}
                        onChange={(e) => setRoom(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-background)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                    />
                </div>
                <div className="flex gap-3 mt-5">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onTransfer(building, floor, room)}
                        disabled={!building && !floor && !room}
                        className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-black font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                        Transfer
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Checkbox Component
function IndeterminateCheckbox({
    indeterminate,
    className = '',
    ...rest
}: { indeterminate?: boolean } & React.HTMLProps<HTMLInputElement>) {
    const ref = React.useRef<HTMLInputElement>(null!);

    React.useEffect(() => {
        if (typeof indeterminate === 'boolean') {
            ref.current.indeterminate = !rest.checked && indeterminate;
        }
    }, [ref, indeterminate]);

    return (
        <label className="relative flex items-center cursor-pointer">
            <input
                type="checkbox"
                ref={ref}
                className={cn(
                    "peer h-4 w-4 appearance-none rounded border border-[var(--border-color)] bg-[var(--bg-card)] checked:bg-[var(--primary)] checked:border-[var(--primary)] transition-all",
                    className
                )}
                {...rest}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 peer-checked:opacity-100 text-black">
                {indeterminate ? <Minus size={12} strokeWidth={4} /> : <Check size={12} strokeWidth={4} />}
            </div>
        </label>
    );
}

function StatusBadge({ status }: { status: string }) {
    let styles = "bg-gray-500/10 text-gray-400 border-gray-500/20";
    let icon = HelpCircle;
    let label = status;

    switch (status) {
        case 'ACTIVE':
            styles = "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20 shadow-[0_0_10px_rgba(109,255,142,0.15)]";
            icon = CheckCircle;
            label = "Active";
            break;
        case 'MAINTENANCE':
            styles = "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]";
            icon = Wrench;
            label = "Maintenance";
            break;
        case 'RETIRED':
            styles = "bg-red-500/10 text-red-400 border-red-500/20";
            icon = XCircle;
            label = "Retired";
            break;
        case 'LOST':
            styles = "bg-purple-500/10 text-purple-400 border-purple-500/20";
            icon = AlertTriangle;
            label = "Lost";
            break;
    }

    const Icon = icon;

    return (
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", styles)}>
            <Icon size={12} />
            {label}
        </div>
    );
}
