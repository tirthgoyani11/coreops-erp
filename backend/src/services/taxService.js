const prisma = require('../config/prisma');

class TaxService {
    /**
     * Calculate tax amount and return breakdown
     * @param {number} amount - The base amount
     * @param {string} taxRateId - The ID of the TaxRate record
     * @returns {Promise<Object>} { baseAmount, taxAmount, totalWithTax, breakdown }
     */
    async calculateTax(amount, taxRateId) {
        if (!taxRateId) {
            return {
                baseAmount: amount,
                taxAmount: 0,
                totalWithTax: amount,
                breakdown: []
            };
        }

        const taxRate = await prisma.taxRate.findUnique({
            where: { id: taxRateId }
        });

        if (!taxRate) {
            throw new Error('Tax rate not found');
        }

        const taxAmount = (amount * taxRate.rate) / 100;
        const totalWithTax = amount + taxAmount;
        const breakdown = [];

        // Simple Indian GST splitting logic
        if (taxRate.type === 'GST') {
            const halfRate = taxRate.rate / 2;
            const halfTax = taxAmount / 2;
            breakdown.push({ type: 'CGST', rate: halfRate, amount: halfTax });
            breakdown.push({ type: 'SGST', rate: halfRate, amount: halfTax });
        } else {
            breakdown.push({ type: taxRate.type, rate: taxRate.rate, amount: taxAmount });
        }

        return {
            baseAmount: amount,
            taxAmount,
            totalWithTax,
            breakdown,
            taxRate
        };
    }
}

module.exports = new TaxService();
