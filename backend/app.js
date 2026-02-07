const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const { errorHandler } = require('./src/utils/errorHandler');
const logger = require('./src/utils/logger');
const { generalLimiter } = require('./src/middleware/rateLimiter');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const officeRoutes = require('./src/routes/officeRoutes');
const assetRoutes = require('./src/routes/assetRoutes');
const inventoryRoutes = require('./src/routes/inventoryRoutes');
const maintenanceRoutes = require('./src/routes/maintenanceRoutes');
const currencyRoutes = require('./src/routes/currencyRoutes');
const vendorRoutes = require('./src/routes/vendorRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const purchaseOrderRoutes = require('./src/routes/purchaseOrderRoutes');
const auditLogRoutes = require('./src/routes/auditLogRoutes');
const ocrRoutes = require('./src/routes/ocrRoutes');
const setupRoutes = require('./src/routes/setupRoutes');

// Services
const currencyService = require('./src/services/currencyService');

const app = express();

// Trust proxy (required for rate limiting behind reverse proxy)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Request ID middleware
app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false,
}));

// Compression
app.use(compression());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173'];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                logger.warn(`CORS blocked request from origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    })
);

// Body parser with limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// HTTP request logging
const morganFormat = process.env.NODE_ENV === 'production'
    ? ':remote-addr - :method :url :status :res[content-length] - :response-time ms'
    : 'dev';

app.use(morgan(morganFormat, {
    stream: logger.stream,
    skip: (req) => req.url === '/health', // Skip health check logs
}));

// General rate limiting (applies to all routes)
if (process.env.NODE_ENV === 'production') {
    app.use(generalLimiter);
}

// Health check endpoint (enhanced for production)
app.get('/health', async (req, res) => {
    const mongoose = require('mongoose');

    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    };

    // Return 503 if database is not connected
    const statusCode = health.database === 'connected' ? 200 : 503;

    res.status(statusCode).json(health);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/setup', setupRoutes);

// Initialize currency rate updates (runs every 4 hours)
currencyService.scheduleRateUpdates();

// 404 handler
app.use((req, res) => {
    logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
        requestId: req.id
    });
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
