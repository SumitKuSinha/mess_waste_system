const mongoose = require('mongoose');
require('dotenv').config();

// Connect to Menu Service Database
const menuDb = mongoose.createConnection(process.env.MENU_DB || 'mongodb://localhost:27017/menu-db');

const menuSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true
  },
  items: {
    breakfast: [String],
    lunch: [String],
    dinner: [String]
  }
});

const Menu = menuDb.model('Menu', menuSchema);

async function createTestMenu() {
  try {
    console.log('🔗 Connecting to Menu Database...');
    await menuDb.asPromise();
    console.log('[OK] Menu DB connected');

    // Delete existing menu for this date
    await Menu.deleteOne({ date: '2026-03-27' });
    console.log('[DELETE]  Cleared existing menu for 2026-03-27');

    // Create test menu
    const menu = await Menu.create({
      date: '2026-03-27',
      items: {
        breakfast: ['Rice', 'Dosa'],
        lunch: ['Dal Rice', 'Roti'],
        dinner: ['Khichdi', 'Noodles']
      }
    });

    console.log('[OK] Test menu created:', JSON.stringify(menu, null, 2));
    
    await menuDb.close();
    console.log('[OK] Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('[ERR] Error:', error.message);
    process.exit(1);
  }
}

createTestMenu();
