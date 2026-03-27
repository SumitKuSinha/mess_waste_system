const app = require('./app');
const logger = require('./utils/logger');
require('dotenv').config();

const PORT = process.env.PORT || 5003;

app.listen(PORT, () => {
  logger.info(`Response Service running on port ${PORT}`);
});
