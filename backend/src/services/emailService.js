/**
 * Email Service using Nodemailer
 * 
 * Provides email notification functionality for approval workflows,
 * low stock alerts, and system notifications.
 */

const nodemailer = require('nodemailer');

// Create transporter with environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Default sender
const defaultFrom = process.env.SMTP_FROM || 'CoreOps ERP <noreply@coreops.local>';

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plain text body (optional)
 */
const sendEmail = async ({ to, subject, html, text }) => {
    // Skip if SMTP not configured
    if (!process.env.SMTP_USER) {
        console.log('[Email Service] SMTP not configured, skipping email:', subject);
        return { success: true, skipped: true };
    }

    try {
        const info = await transporter.sendMail({
            from: defaultFrom,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, ''),
        });

        console.log('[Email Service] Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[Email Service] Failed to send email:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send approval request email
 */
const sendApprovalRequestEmail = async (recipient, ticketNumber, assetName, estimatedCost) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">Approval Required</h1>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                <p>A maintenance ticket requires your approval:</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Ticket Number:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${ticketNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Asset:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${assetName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Estimated Cost:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${estimatedCost.toLocaleString()}</td>
                    </tr>
                </table>
                <p style="margin-top: 20px;">Please log in to CoreOps ERP to review and take action.</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/maintenance" 
                   style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
                    Review Ticket
                </a>
            </div>
        </div>
    `;

    return sendEmail({
        to: recipient,
        subject: `[Approval Required] Maintenance Ticket ${ticketNumber}`,
        html,
    });
};

/**
 * Send ticket approved notification
 */
const sendTicketApprovedEmail = async (recipient, ticketNumber, assetName, approverName) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">✓ Ticket Approved</h1>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                <p>Your maintenance ticket has been approved:</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Ticket Number:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${ticketNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Asset:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${assetName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Approved By:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${approverName}</td>
                    </tr>
                </table>
                <p style="margin-top: 20px;">Work can now proceed on this maintenance ticket.</p>
            </div>
        </div>
    `;

    return sendEmail({
        to: recipient,
        subject: `[Approved] Maintenance Ticket ${ticketNumber}`,
        html,
    });
};

/**
 * Send ticket rejected notification
 */
const sendTicketRejectedEmail = async (recipient, ticketNumber, assetName, reason) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">✗ Ticket Rejected</h1>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                <p>Your maintenance ticket has been rejected:</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Ticket Number:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${ticketNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Asset:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${assetName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Reason:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${reason}</td>
                    </tr>
                </table>
                <p style="margin-top: 20px;">Please review the rejection reason and take appropriate action.</p>
            </div>
        </div>
    `;

    return sendEmail({
        to: recipient,
        subject: `[Rejected] Maintenance Ticket ${ticketNumber}`,
        html,
    });
};

/**
 * Send low stock alert
 */
const sendLowStockAlertEmail = async (recipient, items) => {
    const itemsHtml = items.map(item => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.sku}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #e53e3e; font-weight: bold;">${item.currentQuantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.reorderPoint}</td>
        </tr>
    `).join('');

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">⚠ Low Stock Alert</h1>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                <p>The following items are running low on stock:</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #edf2f7;">
                            <th style="padding: 10px; text-align: left;">Item</th>
                            <th style="padding: 10px; text-align: left;">SKU</th>
                            <th style="padding: 10px; text-align: left;">Current</th>
                            <th style="padding: 10px; text-align: left;">Reorder Point</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/inventory" 
                   style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                    View Inventory
                </a>
            </div>
        </div>
    `;

    return sendEmail({
        to: recipient,
        subject: `[Alert] Low Stock - ${items.length} Item(s) Need Attention`,
        html,
    });
};

/**
 * Send PO approved notification
 */
const sendPOApprovedEmail = async (recipient, poNumber, vendorName, totalAmount) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">✓ Purchase Order Approved</h1>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                <p>Your purchase order has been approved:</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>PO Number:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${poNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Vendor:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${vendorName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Amount:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${totalAmount.toLocaleString()}</td>
                    </tr>
                </table>
                <p style="margin-top: 20px;">The order can now be processed and sent to the vendor.</p>
            </div>
        </div>
    `;

    return sendEmail({
        to: recipient,
        subject: `[Approved] Purchase Order ${poNumber}`,
        html,
    });
};

module.exports = {
    sendEmail,
    sendApprovalRequestEmail,
    sendTicketApprovedEmail,
    sendTicketRejectedEmail,
    sendLowStockAlertEmail,
    sendPOApprovedEmail,
};
