/**
 * Export Utilities
 * 
 * Provides PDF and Excel export functionality for reports and data tables.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';

interface ExportColumn {
    header: string;
    key: string;
    width?: number;
}

interface ExportOptions {
    title: string;
    filename: string;
    columns: ExportColumn[];
    data: Record<string, unknown>[];
    subtitle?: string;
}

/**
 * Export data to PDF
 */
export const exportToPDF = (options: ExportOptions): void => {
    const { title, filename, columns, data, subtitle } = options;

    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(102, 126, 234); // Purple gradient color
    doc.text(title, 14, 20);

    // Subtitle
    if (subtitle) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(subtitle, 14, 28);
    }

    // Generated date
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, subtitle ? 34 : 28);

    // Table
    const tableData = data.map(row =>
        columns.map(col => {
            const value = row[col.key];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value);
        })
    );

    autoTable(doc, {
        head: [columns.map(col => col.header)],
        body: tableData,
        startY: subtitle ? 40 : 34,
        styles: {
            fontSize: 9,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [102, 126, 234],
            textColor: 255,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [245, 247, 250],
        },
        margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Page ${i} of ${pageCount} | CoreOps ERP`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        );
    }

    doc.save(`${filename}.pdf`);
};

/**
 * Export data to Excel
 */
export const exportToExcel = (options: ExportOptions): void => {
    const { title, filename, columns, data } = options;

    const wb = XLSX.utils.book_new();

    // Build plain value arrays first (aoa_to_sheet needs raw values)
    const titleRow = [title];
    const headerValues = columns.map(col => col.header);
    const dataValues = data.map(row =>
        columns.map(col => {
            const value = row[col.key];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return value;
        })
    );

    // Combine: title row → header row → data rows
    const allRows = [titleRow, headerValues, ...dataValues];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    // Style the title cell (A1)
    if (ws['A1']) {
        ws['A1'].s = { font: { bold: true, sz: 14 } };
    }

    // Style header cells (row 2, index 1)
    columns.forEach((_col, i) => {
        const cellRef = XLSX.utils.encode_cell({ r: 1, c: i });
        if (ws[cellRef]) {
            ws[cellRef].s = {
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: '667EEA' } },
                alignment: { horizontal: 'center' },
                border: {
                    bottom: { style: 'thin', color: { rgb: '000000' } },
                },
            };
        }
    });

    // Set column widths
    ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));

    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Export data to CSV
 */
export const exportToCSV = (options: ExportOptions): void => {
    const { filename, columns, data } = options;

    const escapeCSV = (val: unknown): string => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const headerLine = columns.map(col => escapeCSV(col.header)).join(',');
    const dataLines = data.map(row =>
        columns.map(col => escapeCSV(row[col.key])).join(',')
    );

    const csv = [headerLine, ...dataLines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};


/**
 * Export assets data
 */
export const exportAssets = (assets: Record<string, unknown>[], format: 'pdf' | 'excel' | 'csv'): void => {
    const options: ExportOptions = {
        title: 'Asset Report',
        filename: `assets_report_${new Date().toISOString().split('T')[0]}`,
        subtitle: `Total Assets: ${assets.length}`,
        columns: [
            { header: 'GUAI', key: 'guai', width: 20 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Category', key: 'category', width: 12 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Book Value', key: 'currentBookValue', width: 12 },
            { header: 'Office', key: 'officeName', width: 15 },
        ],
        data: assets.map(asset => ({
            ...asset,
            currentBookValue: asset.depreciation && typeof asset.depreciation === 'object'
                ? `₹${((asset.depreciation as Record<string, number>).currentBookValue || 0).toLocaleString()}`
                : '₹0',
            officeName: asset.officeId && typeof asset.officeId === 'object'
                ? (asset.officeId as Record<string, string>).name || 'N/A'
                : 'N/A',
        })),
    };

    if (format === 'pdf') exportToPDF(options);
    else if (format === 'csv') exportToCSV(options);
    else exportToExcel(options);
};

/**
 * Export maintenance tickets
 */
export const exportMaintenance = (tickets: Record<string, unknown>[], format: 'pdf' | 'excel' | 'csv'): void => {
    const options: ExportOptions = {
        title: 'Maintenance Report',
        filename: `maintenance_report_${new Date().toISOString().split('T')[0]}`,
        subtitle: `Total Tickets: ${tickets.length}`,
        columns: [
            { header: 'Ticket #', key: 'ticketNumber', width: 15 },
            { header: 'Asset', key: 'assetName', width: 20 },
            { header: 'Type', key: 'issueType', width: 12 },
            { header: 'Priority', key: 'priority', width: 10 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Est. Cost', key: 'estimatedCost', width: 12 },
        ],
        data: tickets.map(ticket => ({
            ...ticket,
            assetName: ticket.asset && typeof ticket.asset === 'object'
                ? (ticket.asset as Record<string, string>).name || 'N/A'
                : 'N/A',
            estimatedCost: `₹${((ticket.estimatedCost as number) || 0).toLocaleString()}`,
        })),
    };

    if (format === 'pdf') exportToPDF(options);
    else if (format === 'csv') exportToCSV(options);
    else exportToExcel(options);
};

/**
 * Export inventory
 */
export const exportInventory = (inventory: Record<string, unknown>[], format: 'pdf' | 'excel' | 'csv'): void => {
    const options: ExportOptions = {
        title: 'Inventory Report',
        filename: `inventory_report_${new Date().toISOString().split('T')[0]}`,
        subtitle: `Total Items: ${inventory.length}`,
        columns: [
            { header: 'SKU', key: 'sku', width: 15 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Type', key: 'type', width: 10 },
            { header: 'Category', key: 'category', width: 12 },
            { header: 'Quantity', key: 'quantity', width: 10 },
            { header: 'Status', key: 'stockStatus', width: 12 },
        ],
        data: inventory.map(item => ({
            ...item,
            quantity: item.stock && typeof item.stock === 'object'
                ? (item.stock as Record<string, number>).currentQuantity || 0
                : 0,
            stockStatus: item.stock && typeof item.stock === 'object'
                ? ((item.stock as Record<string, number>).currentQuantity || 0) <= 10 ? 'Low Stock' : 'In Stock'
                : 'Unknown',
        })),
    };

    if (format === 'pdf') exportToPDF(options);
    else if (format === 'csv') exportToCSV(options);
    else exportToExcel(options);
};

/**
 * Export audit logs
 */
export const exportAuditLogs = (logs: Record<string, unknown>[], format: 'pdf' | 'excel' | 'csv'): void => {
    const options: ExportOptions = {
        title: 'Audit Log Report',
        filename: `audit_logs_${new Date().toISOString().split('T')[0]}`,
        subtitle: `Total Entries: ${logs.length}`,
        columns: [
            { header: 'Timestamp', key: 'timestamp', width: 18 },
            { header: 'User', key: 'userName', width: 15 },
            { header: 'Action', key: 'action', width: 20 },
            { header: 'Resource', key: 'resourceType', width: 15 },
            { header: 'IP Address', key: 'ipAddress', width: 15 },
        ],
        data: logs.map(log => ({
            ...log,
            timestamp: log.timestamp
                ? new Date(log.timestamp as string).toLocaleString()
                : 'N/A',
            userName: log.user && typeof log.user === 'object'
                ? (log.user as Record<string, string>).name || 'System'
                : 'System',
        })),
    };

    if (format === 'pdf') exportToPDF(options);
    else if (format === 'csv') exportToCSV(options);
    else exportToExcel(options);
};
