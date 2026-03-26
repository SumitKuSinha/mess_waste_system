const app = require('./app');
const cron = require('node-cron');
const { runCalculation } = require('./services/calculation.service');
require('dotenv').config();

const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {
  console.log(`✅ Calculation Service running on port ${PORT}`);
});

/**
 * Automatic calculation scheduler
 * Runs every day at 9 PM (21:00)
 * Format: "0 21 * * *" = minute hour day month day-of-week
 */
cron.schedule('0 21 * * *', async () => {
  console.log('\n🔔 [SCHEDULER] Auto-calculation triggered at 9 PM');
  
  const today = new Date().toISOString().split('T')[0];
  const result = await runCalculation(today);
  
  if (result.success) {
    console.log(`✅ [SCHEDULER] Automatic calculation completed for ${today}`);
    console.log(`📊 [SCHEDULER] Ingredients saved for ${result.data.totalResponses} students`);
  } else {
    console.log(`⚠️ [SCHEDULER] Calculation failed: ${result.message}`);
  }
  console.log('---\n');
});

console.log('⏰ [SCHEDULER] Automatic calculation scheduled for 9 PM daily');
