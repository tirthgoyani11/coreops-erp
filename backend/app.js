const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler } = require('./src/utils/errorHandler');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const officeRoutes = require('./src/routes/officeRoutes');
const assetRoutes = require('./src/routes/assetRoutes');
const inventoryRoutes = require('./src/routes/inventoryRoutes');
const maintenanceRoutes = require('./src/routes/maintenanceRoutes');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    })
);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/maintenance', maintenanceRoutes);

// 404 handler (Express 5 compatible - no wildcard)
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
