const app = require('./app');
const logger = require('./utils/logger');
require('dotenv').config();

const PORT = process.env.PORT || 5006;

app.listen(PORT, () => {
  logger.info(`Notification Service running on port ${PORT}`);
});
