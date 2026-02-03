const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('../utils/errorHandler');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const messages = errors.array().map((err) => err.msg);
        return next(new AppError(messages.join('. '), 400));
    }
    next();
};

/**
 * Auth validation rules
 */
const authValidation = {
    login: [
        body('email')
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
        validate,
    ],
    register: [
        body('name')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters'),
        body('email')
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain uppercase, lowercase, and number'),
        body('role')
            .optional()
            .isIn(['SUPER_ADMIN', 'MANAGER', 'STAFF'])
            .withMessage('Invalid role'),
        body('officeId')
            .optional()
            .isMongoId()
            .withMessage('Invalid office ID'),
        validate,
    ],
};

/**
 * Asset validation rules
 */
const assetValidation = {
    create: [
        body('name')
            .trim()
            .isLength({ min: 2, max: 200 })
            .withMessage('Asset name must be between 2 and 200 characters'),
        body('category')
            .trim()
            .notEmpty()
            .withMessage('Category is required'),
        body('purchaseCost')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Purchase cost must be a positive number'),
        body('currency')
            .optional()
            .isIn(['INR', 'USD', 'EUR', 'GBP'])
            .withMessage('Invalid currency'),
        body('officeId')
            .optional()
            .isMongoId()
            .withMessage('Invalid office ID'),
        body('status')
            .optional()
            .isIn(['ACTIVE', 'MAINTENANCE', 'RETIRED', 'DISPOSED'])
            .withMessage('Invalid status'),
        validate,
    ],
    update: [
        param('id')
            .isMongoId()
            .withMessage('Invalid asset ID'),
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 200 })
            .withMessage('Asset name must be between 2 and 200 characters'),
        body('purchaseCost')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Purchase cost must be a positive number'),
        validate,
    ],
    getById: [
        param('id')
            .isMongoId()
            .withMessage('Invalid asset ID'),
        validate,
    ],
};

/**
 * Inventory validation rules
 */
const inventoryValidation = {
    create: [
        body('name')
            .trim()
            .isLength({ min: 2, max: 200 })
            .withMessage('Inventory name must be between 2 and 200 characters'),
        body('type')
            .isIn(['PRODUCT', 'SPARE'])
            .withMessage('Type must be PRODUCT or SPARE'),
        body('quantity')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Quantity must be a non-negative integer'),
        body('unitPrice')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Unit price must be a positive number'),
        body('officeId')
            .optional()
            .isMongoId()
            .withMessage('Invalid office ID'),
        validate,
    ],
    update: [
        param('id')
            .isMongoId()
            .withMessage('Invalid inventory ID'),
        body('quantity')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Quantity must be a non-negative integer'),
        body('unitPrice')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Unit price must be a positive number'),
        validate,
    ],
    getById: [
        param('id')
            .isMongoId()
            .withMessage('Invalid inventory ID'),
        validate,
    ],
};

/**
 * Office validation rules
 */
const officeValidation = {
    create: [
        body('name')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Office name must be between 2 and 100 characters'),
        body('code')
            .trim()
            .isLength({ min: 2, max: 20 })
            .withMessage('Office code must be between 2 and 20 characters')
            .matches(/^[A-Z0-9_-]+$/i)
            .withMessage('Office code can only contain letters, numbers, underscores, and hyphens'),
        body('country')
            .optional()
            .trim()
            .isLength({ max: 100 })
            .withMessage('Country name too long'),
        body('timezone')
            .optional()
            .trim()
            .isLength({ max: 50 })
            .withMessage('Timezone too long'),
        validate,
    ],
    update: [
        param('id')
            .isMongoId()
            .withMessage('Invalid office ID'),
        validate,
    ],
    getById: [
        param('id')
            .isMongoId()
            .withMessage('Invalid office ID'),
        validate,
    ],
};

/**
 * Maintenance validation rules
 */
const maintenanceValidation = {
    create: [
        body('assetId')
            .isMongoId()
            .withMessage('Invalid asset ID'),
        body('issueDescription')
            .trim()
            .notEmpty()
            .withMessage('Issue description is required')
            .isLength({ max: 2000 })
            .withMessage('Description too long'),
        body('repairCost')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Repair cost must be a positive number'),
        body('currency')
            .optional()
            .isIn(['INR', 'USD', 'EUR', 'GBP'])
            .withMessage('Invalid currency'),
        validate,
    ],
    update: [
        param('id')
            .isMongoId()
            .withMessage('Invalid maintenance ID'),
        body('status')
            .optional()
            .isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
            .withMessage('Invalid status'),
        validate,
    ],
    getById: [
        param('id')
            .isMongoId()
            .withMessage('Invalid maintenance ID'),
        validate,
    ],
};

/**
 * Pagination validation
 */
const paginationValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    validate,
];

module.exports = {
    validate,
    authValidation,
    assetValidation,
    inventoryValidation,
    officeValidation,
    maintenanceValidation,
    paginationValidation,
};
