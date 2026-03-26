const app = require('./app');
const connectDB = require('./config/db');
require('dotenv').config();

const PORT = process.env.PORT || 5002;

connectDB();

app.listen(PORT, () => {
  console.log(`✅ Menu Service running on port ${PORT}`);
});
