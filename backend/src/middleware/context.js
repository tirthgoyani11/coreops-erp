const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Middleware to initialize AsyncLocalStorage for the request lifecycle.
 * This allows passing context (like userId, or collecting audit changes)
 * deeply into Prisma hooks without needing to pass req/res objects everywhere.
 */
const reqContext = (req, res, next) => {
    asyncLocalStorage.run(new Map(), () => {
        // We can pre-populate the map here, but since token verification 
        // happens later, we just set up the empty Map to collect changes.
        next();
    });
};

module.exports = {
    asyncLocalStorage,
    reqContext,
};
