const {
    matchAPInvoiceToOrder,
    getMatchingReport,
} = require('../services/matchingService');
const {
    getTaxReconciliationReport,
    getGSTReconciliation,
    getInvoiceTaxSummary,
    calculateLineTax,
} = require('../services/taxCalculationService');

exports.matchAPInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const { poId, grnId, tolerance } = req.body || {};

        const result = await matchAPInvoiceToOrder({
            apInvoiceId: id,
            poId,
            grnId,
            tolerance,
        });

        res.status(200).json({
            success: true,
            message: 'AP invoice matching completed',
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to match AP invoice',
            error: error.message,
        });
    }
};

exports.getAPMatchingReport = async (req, res) => {
    try {
        const { officeId, status, poId, grnId } = req.query;

        const scopedOfficeId = req.user.role === 'SUPER_ADMIN'
            ? officeId
            : (req.user.officeId || req.user.office?.id);

        const data = await getMatchingReport({
            officeId: scopedOfficeId,
            status,
            poId,
            grnId,
        });

        res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to generate AP matching report',
            error: error.message,
        });
    }
};

exports.getTaxReconciliation = async (req, res) => {
    try {
        const { startDate, endDate, officeId, taxType } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required',
            });
        }

        const scopedOfficeId = req.user.role === 'SUPER_ADMIN'
            ? officeId
            : (req.user.officeId || req.user.office?.id);

        const data = await getTaxReconciliationReport({
            startDate,
            endDate,
            officeId: scopedOfficeId,
            taxType,
        });

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to generate tax reconciliation report',
            error: error.message,
        });
    }
};

exports.getGSTReconciliationReport = async (req, res) => {
    try {
        const { startDate, endDate, officeId, state } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required',
            });
        }

        const scopedOfficeId = req.user.role === 'SUPER_ADMIN'
            ? officeId
            : (req.user.officeId || req.user.office?.id);

        const data = await getGSTReconciliation({
            startDate,
            endDate,
            officeId: scopedOfficeId,
            state,
        });

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to generate GST reconciliation report',
            error: error.message,
        });
    }
};

exports.getInvoiceTaxSummaryReport = async (req, res) => {
    try {
        const { invoiceType, invoiceId } = req.params;
        const normalized = (invoiceType || '').toUpperCase();

        if (!['AP', 'AR'].includes(normalized)) {
            return res.status(400).json({
                success: false,
                message: 'invoiceType must be AP or AR',
            });
        }

        const data = await getInvoiceTaxSummary(invoiceId, normalized);

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoice tax summary',
            error: error.message,
        });
    }
};

exports.calculateTaxForLine = async (req, res) => {
    try {
        const { lineAmount, taxCode } = req.body || {};

        if (lineAmount == null || Number.isNaN(Number(lineAmount))) {
            return res.status(400).json({
                success: false,
                message: 'lineAmount must be a valid number',
            });
        }

        const data = await calculateLineTax(Number(lineAmount), taxCode);

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to calculate line tax',
            error: error.message,
        });
    }
};
