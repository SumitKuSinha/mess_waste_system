const app = require('./app');
const cron = require('node-cron');
const { runCalculation } = require('./services/calculation.service');
const logger = require('./utils/logger');
require('dotenv').config();

const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {
  logger.info(`Calculation Service running on port ${PORT}`);
});

/**
 * Automatic calculation scheduler
 * Runs every day at 9 PM (21:00)
 * Format: "0 21 * * *" = minute hour day month day-of-week
 */
cron.schedule('0 21 * * *', async () => {
  logger.info('[SCHEDULER] Auto-calculation triggered at 9 PM');
  
  const today = new Date().toISOString().split('T')[0];
  const result = await runCalculation(today);
  
  if (result.success) {
    logger.info(`[SCHEDULER] Automatic calculation completed for ${today}`);
    logger.info(`[SCHEDULER] Ingredients saved for ${result.data.totalResponses} students`);
  } else {
    logger.error(`[SCHEDULER] Calculation failed: ${result.message}`);
  }
});

logger.info('[SCHEDULER] Automatic calculation scheduled for 9 PM daily');
