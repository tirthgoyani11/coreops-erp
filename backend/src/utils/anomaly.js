/**
 * Anomaly Detection Utility
 * 
 * Z-score based anomaly detection for financial amounts.
 * Used across Maintenance, Finance, and Procurement modules.
 * 
 * Z-score thresholds:
 *   < 2.0  → Normal (auto-approve)
 *   2.0–3.0 → Elevated (flag for review)
 *   > 3.0  → Anomaly (auto-escalate, require human approval)
 */

const THRESHOLDS = {
    NORMAL: 2.0,
    ELEVATED: 3.0,
};

/**
 * Calculate Z-score for a value against a history of values
 * @param {number} value - The value to check
 * @param {number[]} history - Historical values (min 3 required for meaningful result)
 * @returns {Object} { zScore, mean, stdDev, isAnomaly, isElevated, message }
 */
function calculateZScore(value, history) {
    // Need at least 3 historical values for meaningful Z-score
    if (!history || history.length < 3) {
        return {
            zScore: 0,
            mean: value,
            stdDev: 0,
            isAnomaly: false,
            isElevated: false,
            message: 'Insufficient history for anomaly detection (need ≥ 3 data points)',
            confidence: 0,
        };
    }

    const n = history.length;
    const mean = history.reduce((sum, v) => sum + v, 0) / n;
    const variance = history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // If stdDev is 0 (all values identical), any deviation is an anomaly
    if (stdDev === 0) {
        const isAnomaly = value !== mean;
        return {
            zScore: isAnomaly ? Infinity : 0,
            mean: Math.round(mean * 100) / 100,
            stdDev: 0,
            isAnomaly,
            isElevated: isAnomaly,
            message: isAnomaly
                ? `All ${n} historical values are ₹${mean.toLocaleString('en-IN')}. This value (₹${value.toLocaleString('en-IN')}) is a significant deviation.`
                : 'Value matches historical pattern exactly.',
            confidence: n >= 10 ? 0.95 : n >= 5 ? 0.8 : 0.6,
        };
    }

    const zScore = Math.abs((value - mean) / stdDev);
    const roundedZ = Math.round(zScore * 100) / 100;

    const isAnomaly = zScore > THRESHOLDS.ELEVATED;
    const isElevated = zScore > THRESHOLDS.NORMAL && !isAnomaly;

    let message;
    if (isAnomaly) {
        message = `ANOMALY DETECTED: ₹${value.toLocaleString('en-IN')} has Z-score ${roundedZ} (avg ₹${Math.round(mean).toLocaleString('en-IN')}, σ=₹${Math.round(stdDev).toLocaleString('en-IN')}). Exceeds threshold of ${THRESHOLDS.ELEVATED}. Requires human review.`;
    } else if (isElevated) {
        message = `ELEVATED: ₹${value.toLocaleString('en-IN')} has Z-score ${roundedZ} (avg ₹${Math.round(mean).toLocaleString('en-IN')}). Above normal range but within tolerance.`;
    } else {
        message = `NORMAL: ₹${value.toLocaleString('en-IN')} is within expected range (Z=${roundedZ}, avg ₹${Math.round(mean).toLocaleString('en-IN')}).`;
    }

    return {
        zScore: roundedZ,
        mean: Math.round(mean * 100) / 100,
        stdDev: Math.round(stdDev * 100) / 100,
        isAnomaly,
        isElevated,
        message,
        confidence: n >= 10 ? 0.95 : n >= 5 ? 0.8 : 0.6,
    };
}

/**
 * Detect duplicate transactions
 * @param {Object} params - { vendor, amount, date, officeId }
 * @param {Model} TransactionModel - Mongoose Transaction model
 * @param {number} windowDays - Days to look back (default 7)
 * @returns {Object} { isDuplicate, matches, confidence, message }
 */
async function detectDuplicateTransaction({ vendor, amount, date, officeId }, TransactionModel, windowDays = 7) {
    const targetDate = new Date(date || Date.now());
    const windowStart = new Date(targetDate);
    windowStart.setDate(windowStart.getDate() - windowDays);

    const query = {
        amount,
        date: { $gte: windowStart, $lte: targetDate },
    };
    if (officeId) query.officeId = officeId;

    const matches = await TransactionModel.find(query)
        .sort({ date: -1 })
        .limit(5)
        .lean();

    const isDuplicate = matches.length > 0;
    let confidence = 0;

    if (isDuplicate) {
        // Higher confidence if same vendor + amount + similar date
        const exactMatches = matches.filter(m =>
            m.description && vendor &&
            m.description.toLowerCase().includes(vendor.toLowerCase())
        );
        confidence = exactMatches.length > 0 ? 0.95 : 0.7;
    }

    return {
        isDuplicate,
        matches,
        confidence,
        message: isDuplicate
            ? `Potential duplicate: ${matches.length} transaction(s) with ₹${amount.toLocaleString('en-IN')} found in last ${windowDays} days.`
            : 'No duplicates detected.',
    };
}

/**
 * Calculate rolling average for a category
 * @param {Object[]} history - Array of { amount, date } objects
 * @param {number} windowDays - Rolling window in days (default 90)
 * @returns {Object} { average, count, windowDays }
 */
function rollingAverage(history, windowDays = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);

    const windowItems = history.filter(h => new Date(h.date || h.createdAt) >= cutoff);

    if (windowItems.length === 0) {
        return { average: 0, count: 0, windowDays };
    }

    const sum = windowItems.reduce((s, h) => s + (h.amount || h.actualCost || h.repairCost || 0), 0);
    return {
        average: Math.round((sum / windowItems.length) * 100) / 100,
        count: windowItems.length,
        windowDays,
    };
}

module.exports = {
    calculateZScore,
    detectDuplicateTransaction,
    rollingAverage,
    THRESHOLDS,
};
