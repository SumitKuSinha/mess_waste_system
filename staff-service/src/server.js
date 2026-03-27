const app = require('./app');
const logger = require('./utils/logger');
require('dotenv').config();

const PORT = process.env.PORT || 5005;

app.listen(PORT, () => {
  logger.info(`Staff Service running on port ${PORT}`);
});
