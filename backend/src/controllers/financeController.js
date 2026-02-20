const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

// @desc    Get All Transactions
// @route   GET /api/finance/transactions
exports.getTransactions = async (req, res) => {
    try {
        const { type, category, startDate, endDate } = req.query;
        let query = { officeId: req.user.officeId };

        if (type) query.type = type;
        if (category) query.category = category;
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const transactions = await Transaction.find(query)
            .sort({ date: -1 })
            .populate('recordedBy', 'name');

        res.status(200).json({ success: true, count: transactions.length, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Create Transaction
// @route   POST /api/finance/transactions
exports.createTransaction = async (req, res) => {
    try {
        const { type, category, amount, description, referenceType, referenceId, date } = req.body;

        const transaction = await Transaction.create({
            type,
            category,
            amount,
            description,
            referenceType,
            referenceId,
            date: date || Date.now(),
            officeId: req.user.officeId,
            recordedBy: req.user._id
        });

        // Update Budget if Expense
        if (type === 'EXPENSE') {
            const dateObj = new Date(transaction.date);
            const month = dateObj.getMonth() + 1;
            const year = dateObj.getFullYear();

            await Budget.findOneAndUpdate(
                {
                    officeId: req.user.officeId,
                    category: category,
                    'period.month': month,
                    'period.year': year
                },
                { $inc: { 'amount.spent': amount } },
                { upsert: false } // Only update if budget exists
            );
        }

        res.status(201).json({ success: true, data: transaction });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Set/Update Budget
// @route   POST /api/finance/budgets
exports.setBudget = async (req, res) => {
    try {
        const { category, month, year, limit } = req.body;

        const budget = await Budget.findOneAndUpdate(
            {
                officeId: req.user.officeId,
                category,
                'period.month': month,
                'period.year': year
            },
            {
                $set: { 'amount.limit': limit }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ success: true, data: budget });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get Budgets Status
// @route   GET /api/finance/budgets
exports.getBudgets = async (req, res) => {
    try {
        const { month, year } = req.query;
        let query = { officeId: req.user.officeId };

        if (month) query['period.month'] = month;
        if (year) query['period.year'] = year;

        const budgets = await Budget.find(query);
        res.status(200).json({ success: true, data: budgets });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
