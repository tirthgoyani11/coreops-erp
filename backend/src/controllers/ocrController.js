const Invoice = require('../models/Invoice');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MOCK_KEY');

function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString('base64'),
            mimeType
        },
    };
}

// @desc    Upload and Process Invoice
// @route   POST /api/ocr/upload
// @access  Private
exports.processInvoice = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const filePath = req.file.path;
        let extractedData = {};

        // 1. Process with Gemini (if Key exists)
        if (process.env.GEMINI_API_KEY) {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const prompt = "Extract the following details from this invoice image in strict JSON format: invoiceNumber (string), date (YYYY-MM-DD), vendorName (string), totalAmount (number), lineItems (array of objects with description, quantity, unitPrice, total). If a field is missing, use null.";

                const imagePart = fileToGenerativePart(filePath, req.file.mimetype);
                const result = await model.generateContent([prompt, imagePart]);
                const response = await result.response;
                const text = response.text();

                // Clean markdown JSON if present
                const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
                extractedData = JSON.parse(jsonStr);
                extractedData.confidenceScore = 0.9; // Arbitrary high confidence for AI
            } catch (aiError) {
                console.error('Gemini Error:', aiError);
                extractedData = { error: 'AI Processing Failed', rawError: aiError.message };
            }
        } else {
            // Mock Data if no Key (for dev)
            extractedData = {
                invoiceNumber: "INV-" + Math.floor(Math.random() * 1000),
                vendorName: "Demo Vendor Corp",
                date: new Date().toISOString(),
                totalAmount: 1500.00,
                lineItems: [
                    { description: "Service Charge", quantity: 1, unitPrice: 1500, total: 1500 }
                ],
                confidenceScore: 0.5,
                note: "Mock Data (GEMINI_API_KEY missing)"
            };
        }

        // 2. Save Record
        const invoice = await Invoice.create({
            originalFileName: req.file.originalname,
            filePath: filePath,
            uploadedBy: req.user._id,
            extractedData: extractedData,
            status: 'REVIEW_REQUIRED'
        });

        res.status(200).json({ success: true, data: invoice });

    } catch (error) {
        // Cleanup file if error
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get Invoice by ID
exports.getInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
        res.status(200).json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
