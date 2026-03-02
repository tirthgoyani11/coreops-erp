const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
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
const profileRoutes = require('./src/routes/profileRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const documentRoutes = require('./src/routes/documentRoutes');
const financeRoutes = require('./src/routes/financeRoutes');
const glRoutes = require('./src/routes/glRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const procurementMatchRoutes = require('./src/routes/procurementMatchRoutes');
// Trigger restart for finance routes - V2

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

// Cookie parser (for httpOnly refresh tokens)
app.use(cookieParser());

// Body parser with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    const prisma = require('./src/config/prisma');
    let dbStatus = 'disconnected';

    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
    } catch (e) {
        dbStatus = 'disconnected';
    }

    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        database: dbStatus,
    };

    const statusCode = dbStatus === 'connected' ? 200 : 503;

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
app.use('/api/profile', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/gl', glRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/procurement', procurementMatchRoutes);

// Serve uploaded files (local storage — dev mode)
const path = require('path');
app.use('/uploads', require('express').static(path.join(__dirname, 'uploads')));

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
