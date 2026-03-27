const mongoose = require('mongoose');
require('dotenv').config();

const Waste = require('./src/models/waste.model');
const Calculation = require('./src/models/calculation.model');

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
    console.log('✅ Connected to MongoDB\n');

    // Check waste data
    console.log('📋 Checking waste data for 2026-04-03...');
    const waste = await Waste.findOne({ date: '2026-04-03' });
    
    if (!waste) {
      console.log('❌ NO WASTE DATA FOUND FOR 2026-04-03!');
      console.log('\n🔍 All waste records in database:');
      const allWaste = await Waste.find();
      allWaste.forEach(w => {
        console.log(`   Date: ${w.date}, Waste:`, w.waste);
      });
    } else {
      console.log('✅ Waste data found:');
      console.log(`   Date: ${waste.date}`);
      console.log(`   Waste object:`, waste.waste);
      console.log(`   Waste type:`, waste.waste instanceof Map ? 'Map' : typeof waste.waste);
      
      // Test conversion
      const wasteMap = {};
      if (waste.waste instanceof Map) {
        for (const [key, value] of waste.waste) {
          wasteMap[key] = value;
        }
      } else {
        Object.assign(wasteMap, waste.waste);
      }
      console.log(`   Converted to object:`, wasteMap);
    }

    // Check calculation data
    console.log('\n📊 Checking calculation data for 2026-04-03...');
    const calc = await Calculation.findOne({ date: '2026-04-03' });
    
    if (!calc) {
      console.log('❌ NO CALCULATION DATA FOR 2026-04-03!');
    } else {
      console.log('✅ Calculation data found:');
      console.log(`   Total ingredients:`, calc.ingredients);
      console.log(`   Breakfast ingredients:`, calc.ingredients?.breakfast);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

check();
