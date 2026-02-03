const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, requestId, ...metadata }) => {
        let log = `${timestamp} [${level.toUpperCase()}]`;
        if (requestId) log += ` [${requestId}]`;
        log += `: ${message}`;

        if (Object.keys(metadata).length > 0) {
            log += ` ${JSON.stringify(metadata)}`;
        }

        if (stack) {
            log += `\n${stack}`;
        }

        return log;
    })
);

// JSON format for production (better for log aggregators)
const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: process.env.NODE_ENV === 'production' ? jsonFormat : logFormat,
    defaultMeta: { service: 'coreops-erp' },
    transports: [
        // Console transport (always enabled)
        new winston.transports.Console({
            format: process.env.NODE_ENV === 'production'
                ? jsonFormat
                : winston.format.combine(
                    winston.format.colorize(),
                    logFormat
                ),
        }),
    ],
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    const logsDir = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');

    // Error log file
    logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));

    // Combined log file
    logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));
}

// Stream for morgan HTTP logging
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    },
};

module.exports = logger;
