const app = require('./app');
const logger = require('./utils/logger');
const { connectQueue } = require('./utils/rabbitmq');
require('dotenv').config();

const PORT = process.env.PORT || 5003;

// Initialize and start server
async function startServer() {
  try {
    // Connect to RabbitMQ first
    await connectQueue();
    
    app.listen(PORT, () => {
      logger.info(`Response Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
