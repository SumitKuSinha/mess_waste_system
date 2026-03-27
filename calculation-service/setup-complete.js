const mongoose = require('mongoose');
require('dotenv').config();

// Database connections
const calcDb = mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
const menuDb = mongoose.createConnection('mongodb://localhost:27017/smart-mess-menu');
const responseDb = mongoose.createConnection('mongodb://localhost:27017/response-db');

// Models
const Recipe = require('./src/models/recipe.model');

const menuSchema = new mongoose.Schema({
  date: { type: String, unique: true },
  items: { breakfast: [String], lunch: [String], dinner: [String] }
});
const Menu = menuDb.model('Menu', menuSchema);

const responseSchema = new mongoose.Schema({
  studentId: String,
  date: String,
  meals: { breakfast: String, lunch: String, dinner: String }
});
const Response = responseDb.model('Response', responseSchema);

const RECIPES = [
  {
    name: 'Rice',
    category: 'breakfast',
    ingredients: [
      { item: 'Rice', qtyPerPerson: 50, unit: 'g' },
      { item: 'Oil', qtyPerPerson: 10, unit: 'g' },
      { item: 'Salt', qtyPerPerson: 2, unit: 'g' },
      { item: 'Spices', qtyPerPerson: 0.01, unit: 'kg' }
    ]
  },
  {
    name: 'Dosa',
    category: 'breakfast',
    ingredients: [
      { item: 'Rice Flour', qtyPerPerson: 40, unit: 'g' },
      { item: 'Urad Dal', qtyPerPerson: 20, unit: 'g' },
      { item: 'Oil', qtyPerPerson: 15, unit: 'g' },
      { item: 'Salt', qtyPerPerson: 1, unit: 'g' }
    ]
  },
  {
    name: 'Dal Rice',
    category: 'lunch',
    ingredients: [
      { item: 'Rice', qtyPerPerson: 75, unit: 'g' },
      { item: 'Urad Dal', qtyPerPerson: 30, unit: 'g' },
      { item: 'Oil', qtyPerPerson: 15, unit: 'g' },
      { item: 'Spices', qtyPerPerson: 0.01, unit: 'kg' }
    ]
  },
  {
    name: 'Roti',
    category: 'lunch',
    ingredients: [
      { item: 'Wheat Flour', qtyPerPerson: 60, unit: 'g' },
      { item: 'Oil', qtyPerPerson: 5, unit: 'g' },
      { item: 'Salt', qtyPerPerson: 1, unit: 'g' }
    ]
  },
  {
    name: 'Khichdi',
    category: 'dinner',
    ingredients: [
      { item: 'Rice', qtyPerPerson: 60, unit: 'g' },
      { item: 'Moong Dal', qtyPerPerson: 25, unit: 'g' },
      { item: 'Oil', qtyPerPerson: 15, unit: 'g' },
      { item: 'Spices', qtyPerPerson: 0.01, unit: 'kg' }
    ]
  },
  {
    name: 'Noodles',
    category: 'dinner',
    ingredients: [
      { item: 'Noodles', qtyPerPerson: 60, unit: 'g' },
      { item: 'Onion', qtyPerPerson: 30, unit: 'g' },
      { item: 'Oil', qtyPerPerson: 15, unit: 'g' }
    ]
  }
];

async function setup() {
  try {
    console.log('🔗 Connecting to databases...');
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
    await menuDb.asPromise();
    await responseDb.asPromise();
    console.log('✅ All databases connected\n');

    // 1. Seed recipes
    console.log('📚 Seeding recipes...');
    await Recipe.deleteMany({});
    const recipes = await Recipe.insertMany(RECIPES);
    console.log(`✅ Seeded ${recipes.length} recipes`);
    RECIPES.forEach(r => {
      const ingr = r.ingredients.map(i => `${i.item}(${i.qtyPerPerson}${i.unit})`).join(', ');
      console.log(`   - ${r.name}: ${ingr}`);
    });

    // 2. Create test menu with items that match recipe names
    console.log('\n📅 Creating test menu for 2026-03-27...');
    await Menu.deleteMany({});
    const menu = await Menu.create({
      date: '2026-03-27',
      items: {
        breakfast: ['Rice', 'Dosa'],           // Must match recipe names EXACTLY
        lunch: ['Dal Rice', 'Roti'],
        dinner: ['Khichdi', 'Noodles']
      }
    });
    console.log('✅ Menu created:');
    console.log(`   Breakfast: ${menu.items.breakfast.join(', ')}`);
    console.log(`   Lunch: ${menu.items.lunch.join(', ')}`);
    console.log(`   Dinner: ${menu.items.dinner.join(', ')}`);

    // 3. Create test student responses
    console.log('\n👥 Creating test student responses...');
    await Response.deleteMany({ date: '2026-03-27' });
    const response = await Response.create({
      studentId: 'student1',
      date: '2026-03-27',
      meals: {
        breakfast: 'full',
        lunch: 'full',
        dinner: 'half'
      }
    });
    console.log('✅ Response created:');
    console.log(`   Student: ${response.studentId}`);
    console.log(`   Breakfast: ${response.meals.breakfast} (1 meal)`);
    console.log(`   Lunch: ${response.meals.lunch} (1 meal)`);
    console.log(`   Dinner: ${response.meals.dinner} (0.5 meals)`);

    // 4. Verify all recipe names match menu
    console.log('\n🔍 Verifying menu items match recipes...');
    const allMenuItems = [...menu.items.breakfast, ...menu.items.lunch, ...menu.items.dinner];
    const recipeNames = recipes.map(r => r.name);
    
    let allMatched = true;
    for (const item of allMenuItems) {
      const found = recipeNames.includes(item);
      console.log(`   ${found ? '✅' : '❌'} "${item}"`);
      if (!found) allMatched = false;
    }

    if (allMatched) {
      console.log('\n✅ All menu items match recipes! Ready for calculation.');
    } else {
      console.log('\n❌ Some menu items don\'t match recipe names!');
    }

    console.log('\n📝 Next step: Call /api/calculate/2026-03-27');
    console.log('   Expected: Should calculate ingredients with quantities!');

    await mongoose.connection.close();
    await menuDb.close();
    await responseDb.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setup();
