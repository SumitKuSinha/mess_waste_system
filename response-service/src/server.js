const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 5003;

app.listen(PORT, () => {
  console.log(`✅ Response Service running on port ${PORT}`);
});
