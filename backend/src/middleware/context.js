const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

function getStore() {
    return asyncLocalStorage.getStore();
}

function setContextValue(key, value) {
    const store = getStore();
    if (!store) return;
    store.set(key, value);
}

function getContextValue(key) {
    const store = getStore();
    if (!store) return undefined;
    return store.get(key);
}

/**
 * Middleware to initialize AsyncLocalStorage for the request lifecycle.
 * This allows passing context (like userId, or collecting audit changes)
 * deeply into Prisma hooks without needing to pass req/res objects everywhere.
 */
const reqContext = (req, res, next) => {
    asyncLocalStorage.run(new Map(), () => {
        const store = getStore();
        if (store) {
            store.set('requestId', req.id || null);
            store.set('traceId', req.traceId || req.id || null);
            store.set('requestPath', req.originalUrl || req.url || null);
            store.set('requestMethod', req.method || null);
            store.set('startedAt', Date.now());
        }
        next();
    });
};

module.exports = {
    asyncLocalStorage,
    reqContext,
    getStore,
    setContextValue,
    getContextValue,
};
