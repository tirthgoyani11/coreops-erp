// Memory Cache Middleware for Performance Optimization (Phase 8)

const cache = new Map();

/**
 * Cache middleware for exact request URLs
 * @param {number} durationSec - How long to cache the response in seconds
 */
const cacheMiddleware = (durationSec) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Build cache key based on URL + query params + office context
        // Include user's officeId to ensure data isolation is maintained in cache
        const officeId = req.user?.officeId || 'all';
        const key = `__cache__${req.originalUrl || req.url}__${officeId}`;

        const cachedResponse = cache.get(key);

        if (cachedResponse && cachedResponse.expires > Date.now()) {
            // Send cached response
            return res.json(cachedResponse.data);
        } else if (cachedResponse) {
            // Expired, remove from cache
            cache.delete(key);
        }

        // Override res.json to capture response before sending
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            // Store in cache
            cache.set(key, {
                data: body,
                expires: Date.now() + (durationSec * 1000)
            });

            // Call original json method
            return originalJson(body);
        };

        next();
    };
};

/**
 * Utility to clear cache for specific patterns (useful after mutations)
 * @param {string} urlPattern - Substring to match in cache keys
 */
const clearCache = (urlPattern) => {
    for (const key of cache.keys()) {
        if (key.includes(urlPattern)) {
            cache.delete(key);
        }
    }
};

module.exports = {
    cacheMiddleware,
    clearCache
};
