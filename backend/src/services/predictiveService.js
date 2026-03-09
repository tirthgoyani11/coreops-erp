/**
 * Predictive Maintenance Service
 * 
 * Analyzes historical maintenance data per asset to predict future failures:
 * - MTBF (Mean Time Between Failures) calculation
 * - Simple linear regression for next failure prediction
 * - Risk scoring based on failure frequency and cost
 */

const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// ── Calculate MTBF for an asset ────────────────────────
function calculateMTBF(tickets) {
    if (tickets.length < 2) return null;

    // Sort by creation date
    const sorted = [...tickets].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    let totalDays = 0;
    for (let i = 1; i < sorted.length; i++) {
        const diff = (new Date(sorted[i].createdAt) - new Date(sorted[i - 1].createdAt)) / (1000 * 60 * 60 * 24);
        totalDays += diff;
    }

    return totalDays / (sorted.length - 1); // Average days between failures
}

// ── Linear regression for next failure prediction ──────
function predictNextFailure(tickets) {
    if (tickets.length < 3) return null;

    const sorted = [...tickets].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const firstDate = new Date(sorted[0].createdAt).getTime();

    // Convert dates to day numbers from first ticket
    const points = sorted.map(t => (new Date(t.createdAt).getTime() - firstDate) / (1000 * 60 * 60 * 24));

    // Simple linear regression: y = mx + b where x is ticket index, y is day number
    const n = points.length;
    const sumX = points.reduce((s, _, i) => s + i, 0);
    const sumY = points.reduce((s, y) => s + y, 0);
    const sumXY = points.reduce((s, y, i) => s + i * y, 0);
    const sumX2 = points.reduce((s, _, i) => s + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next (n-th index) failure
    const predictedDay = slope * n + intercept;
    const predictedDate = new Date(firstDate + predictedDay * 24 * 60 * 60 * 1000);

    // Don't return dates in the past
    if (predictedDate < new Date()) {
        // If prediction is in the past, asset is overdue for maintenance
        return { date: new Date(), overdue: true, confidence: 'LOW' };
    }

    // Confidence based on R² (coefficient of determination)
    const meanY = sumY / n;
    const ssRes = points.reduce((s, y, i) => s + Math.pow(y - (slope * i + intercept), 2), 0);
    const ssTot = points.reduce((s, y) => s + Math.pow(y - meanY, 2), 0);
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

    const confidence = rSquared > 0.8 ? 'HIGH' : rSquared > 0.5 ? 'MEDIUM' : 'LOW';

    return { date: predictedDate, overdue: false, confidence, rSquared: Math.round(rSquared * 100) / 100 };
}

// ── Risk scoring ───────────────────────────────────────
function calculateRiskScore(tickets, mtbf) {
    if (!tickets.length) return { score: 0, level: 'LOW' };

    const totalCost = tickets.reduce((s, t) => s + (t.actualCost || t.estimatedCost || 0), 0);
    const avgCost = totalCost / tickets.length;
    const frequency = tickets.length;

    // Risk factors (0-100 scale)
    const frequencyScore = Math.min(100, frequency * 10); // More tickets = higher risk
    const costScore = Math.min(100, avgCost / 100); // Higher avg cost = higher risk
    const mtbfScore = mtbf ? Math.max(0, 100 - mtbf) : 50; // Lower MTBF = higher risk

    const criticalCount = tickets.filter(t => t.priority === 'CRITICAL' || t.priority === 'HIGH').length;
    const severityScore = Math.min(100, (criticalCount / Math.max(1, tickets.length)) * 100);

    const score = Math.round((frequencyScore * 0.3 + costScore * 0.2 + mtbfScore * 0.3 + severityScore * 0.2));

    const level = score > 70 ? 'CRITICAL' : score > 50 ? 'HIGH' : score > 30 ? 'MEDIUM' : 'LOW';

    return { score, level, factors: { frequency: frequencyScore, cost: costScore, mtbf: mtbfScore, severity: severityScore } };
}

// ── API: Get Predictions for an Asset ──────────────────
exports.getAssetPredictions = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const tickets = await prisma.maintenanceTicket.findMany({
        where: { assetId: id },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true, createdAt: true, completedDate: true,
            issueType: true, priority: true, status: true,
            actualCost: true, estimatedCost: true,
        },
    });

    const asset = await prisma.asset.findUnique({
        where: { id },
        select: { id: true, name: true, category: true, purchaseDate: true, currentBookValue: true },
    });

    if (!asset) {
        return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    const mtbf = calculateMTBF(tickets);
    const prediction = predictNextFailure(tickets);
    const risk = calculateRiskScore(tickets, mtbf);

    // Recommended actions
    const actions = [];
    if (risk.level === 'CRITICAL') actions.push('Immediate inspection recommended');
    if (risk.level === 'HIGH') actions.push('Schedule preventive maintenance within 7 days');
    if (prediction?.overdue) actions.push('Asset is overdue for maintenance based on historical patterns');
    if (mtbf && mtbf < 30) actions.push('Consider replacing asset — failure frequency is very high');
    if (mtbf && mtbf < 60) actions.push('Increase preventive maintenance frequency');
    if (tickets.length === 0) actions.push('No maintenance history — establish baseline inspection');

    const totalCost = tickets.reduce((s, t) => s + (t.actualCost || t.estimatedCost || 0), 0);

    res.status(200).json({
        success: true,
        data: {
            asset: { id: asset.id, name: asset.name, category: asset.category },
            statistics: {
                totalTickets: tickets.length,
                totalCost,
                avgCostPerTicket: tickets.length > 0 ? Math.round(totalCost / tickets.length) : 0,
                mtbfDays: mtbf ? Math.round(mtbf) : null,
            },
            prediction: prediction ? {
                nextFailureDate: prediction.date,
                overdue: prediction.overdue,
                confidence: prediction.confidence,
                rSquared: prediction.rSquared,
            } : null,
            risk,
            recommendedActions: actions,
        },
    });
});

// ── API: Get Fleet-Wide Risk Overview ──────────────────
exports.getFleetRisk = asyncHandler(async (req, res) => {
    const where = {};
    if (req.user.role !== 'SUPER_ADMIN') where.officeId = req.user.officeId;

    const assets = await prisma.asset.findMany({
        where: { ...where, status: 'ACTIVE' },
        select: { id: true, name: true, category: true },
    });

    const results = [];
    for (const asset of assets) {
        const tickets = await prisma.maintenanceTicket.findMany({
            where: { assetId: asset.id },
            select: { createdAt: true, priority: true, actualCost: true, estimatedCost: true },
        });

        const mtbf = calculateMTBF(tickets);
        const risk = calculateRiskScore(tickets, mtbf);

        results.push({
            id: asset.id,
            name: asset.name,
            category: asset.category,
            ticketCount: tickets.length,
            mtbfDays: mtbf ? Math.round(mtbf) : null,
            riskScore: risk.score,
            riskLevel: risk.level,
        });
    }

    // Sort by risk score descending
    results.sort((a, b) => b.riskScore - a.riskScore);

    const summary = {
        critical: results.filter(r => r.riskLevel === 'CRITICAL').length,
        high: results.filter(r => r.riskLevel === 'HIGH').length,
        medium: results.filter(r => r.riskLevel === 'MEDIUM').length,
        low: results.filter(r => r.riskLevel === 'LOW').length,
    };

    res.status(200).json({
        success: true,
        data: { summary, assets: results },
    });
});
