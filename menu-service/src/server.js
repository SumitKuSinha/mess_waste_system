const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
require('dotenv').config();

const PORT = process.env.PORT || 5002;

connectDB();

app.listen(PORT, () => {
  logger.info(`Menu Service running on port ${PORT}`);
});
