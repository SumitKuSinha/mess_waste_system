const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
require('dotenv').config();

const PORT = process.env.PORT || 5001;

connectDB();

app.listen(PORT, () => {
  logger.info(`Auth Service running on port ${PORT}`);
});
