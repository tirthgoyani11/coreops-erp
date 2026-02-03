/**
 * Pagination Helper Utility
 * Provides standardized pagination for all list endpoints
 */

/**
 * Parse pagination parameters from request query
 * @param {Object} query - Express request query object
 * @returns {Object} Parsed pagination options
 */
const parsePaginationParams = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

/**
 * Build pagination response metadata
 * @param {Object} options - Pagination options
 * @param {number} options.total - Total document count
 * @param {number} options.page - Current page
 * @param {number} options.limit - Items per page
 * @returns {Object} Pagination metadata
 */
const buildPaginationMeta = ({ total, page, limit }) => {
    const totalPages = Math.ceil(total / limit);

    return {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
    };
};

/**
 * Apply pagination to a Mongoose query
 * @param {Query} query - Mongoose query object
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Paginated results with metadata
 */
const paginateQuery = async (Model, filter, req, populateOptions = []) => {
    const { page, limit, skip } = parsePaginationParams(req.query);

    // Get total count
    const total = await Model.countDocuments(filter);

    // Build query with pagination
    let query = Model.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    // Apply population if specified
    populateOptions.forEach(opt => {
        query = query.populate(opt);
    });

    const data = await query;

    return {
        data,
        pagination: buildPaginationMeta({ total, page, limit }),
    };
};

module.exports = {
    parsePaginationParams,
    buildPaginationMeta,
    paginateQuery,
};
