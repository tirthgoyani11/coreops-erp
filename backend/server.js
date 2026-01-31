require('dotenv').config();
const app = require('./app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// Connect to database and start server
const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🚀 CoreOps ERP Backend Server                   ║
║                                                    ║
║   Environment: ${process.env.NODE_ENV || 'development'.padEnd(20)}      ║
║   Port:        ${String(PORT).padEnd(20)}          ║
║   Status:      Running                             ║
║                                                    ║
╚════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
});
