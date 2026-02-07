const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

const logger = require('../utils/logger');

/**
 * OCR Service using Tesseract.js
 * 
 * Extracts data from invoice images including:
 * - Date
 * - Total Amount
 * - Vendor Name (basic matching)
 * - Invoice Number
 */

/**
 * Scan an image and extract text
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<Object>} Extracted data
 */
const scanInvoice = async (imagePath) => {
    try {
        logger.info(`Starting OCR scan for: ${imagePath}`);

        const { data: { text } } = await Tesseract.recognize(
            imagePath,
            'eng',
            { logger: m => logger.debug(m) }
        );

        logger.info(`OCR Scan Complete. Extracted Text Length: ${text.length}`);

        // Parse the extracted text
        const parsedData = parseInvoiceText(text);

        // Clean up uploaded file
        fs.unlink(imagePath, (err) => {
            if (err) logger.error('Failed to delete temp file:', err);
        });

        return {
            rawText: text,
            ...parsedData
        };
    } catch (error) {
        logger.error('OCR Scan Failed:', error);
        throw new Error('Failed to process image');
    }
};

/**
 * Parse extracted text to find key fields
 * @param {string} text 
 */
const parseInvoiceText = (text) => {
    const lines = text.split('\n');
    let totalAmount = null;
    let date = null;
    let invoiceNumber = null;
    let vendorName = null;

    // improved matching patterns
    const datePatterns = [
        /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/, // 12/01/2024
        /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[ a-z]* \d{1,2},? \d{4}\b/i, // Jan 12, 2024
    ];

    const amountPatterns = [
        /(?:total|amount|due|balance)[\s:]*[\$]?\s*(\d{1,3}(?:,\d{3})*\.\d{2})/i, // Total: $1,234.56
        /\$\s*(\d{1,3}(?:,\d{3})*\.\d{2})/, // $1,234.56
    ];

    const invoicePatterns = [
        /(?:invoice|inv)[\s#]*[:\.]?\s*([a-z0-9\-\/]+)/i, // Invoice #: INV-001
    ];

    // Simple vendor extraction (first non-empty line usually)
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 3 && !vendorName && !trimmed.match(/invoice|bill|receipt/i)) {
            vendorName = trimmed;
        }

        // Date extraction
        if (!date) {
            for (const pattern of datePatterns) {
                const match = line.match(pattern);
                if (match) {
                    date = new Date(match[0]);
                    break;
                }
            }
        }

        // Amount extraction
        if (!totalAmount) {
            for (const pattern of amountPatterns) {
                const match = line.match(pattern);
                if (match) {
                    totalAmount = parseFloat(match[1].replace(/,/g, ''));
                    break;
                }
            }
        }

        // Invoice Number extraction
        if (!invoiceNumber) {
            for (const pattern of invoicePatterns) {
                const match = line.match(pattern);
                if (match) {
                    invoiceNumber = match[1];
                    break;
                }
            }
        }
    }

    return {
        totalAmount,
        date,
        invoiceNumber,
        vendorName: vendorName || 'Unknown Vendor'
    };
};

module.exports = {
    scanInvoice
};
