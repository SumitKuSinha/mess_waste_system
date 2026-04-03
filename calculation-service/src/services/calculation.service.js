const axios = require('axios');
const Calculation = require('../models/calculation.model');
const Recipe = require('../models/recipe.model');
const { deleteCache } = require('../config/redis');

// Wastage buffer for realistic kitchen calculations (10% extra for waste)
const WASTAGE_PERCENT = 10;

/**
 * Performs automatic calculation for a given date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<object>} - Calculation result
 */
async function runCalculation(date) {
  try {
    console.log(`[CALCULATION] Processing date: ${date}`);

    // Step 1: Get all responses from Response Service (API call)
    console.log(`[CALCULATION] 🌐 Fetching responses from localhost:5003...`);
    const responseRes = await axios.get(`http://localhost:5003/api/response/all?date=${date}&force=true`, {
      timeout: 5000
    });
    console.log(`[CALCULATION] [OK] Got response from service: ${responseRes.status}`);
    const responses = responseRes.data.data;

    if (!responses || responses.length === 0) {
      console.log(`[CALCULATION] No responses found for ${date}`);
      return { success: false, message: 'No responses found for this date' };
    }

    console.log(`[CALCULATION] Found ${responses.length} responses for ${date}`);

    // Step 2: Calculate meal counts
    let breakfastCount = 0;
    let lunchCount = 0;
    let dinnerCount = 0;

    responses.forEach((response) => {
      if (response.meals?.breakfast === 'full') breakfastCount += 1;
      else if (response.meals?.breakfast === 'half') breakfastCount += 0.5;

      if (response.meals?.lunch === 'full') lunchCount += 1;
      else if (response.meals?.lunch === 'half') lunchCount += 0.5;

      if (response.meals?.dinner === 'full') dinnerCount += 1;
      else if (response.meals?.dinner === 'half') dinnerCount += 0.5;
    });

    console.log(`[CALCULATION] Meal counts - Breakfast: ${breakfastCount}, Lunch: ${lunchCount}, Dinner: ${dinnerCount}`);

    // Step 3: Get menu from Menu Service (API call)
    console.log(`[CALCULATION] 🌐 Fetching menu from localhost:5002...`);
    const menuRes = await axios.get(`http://localhost:5002/api/menu/get/${date}`, {
      timeout: 5000
    });
    console.log(`[CALCULATION] [OK] Got menu from service: ${menuRes.status}`);
    const menu = menuRes.data;

    if (!menu) {
      console.log(`[CALCULATION] No menu found for ${date}`);
      return { success: false, message: 'No menu found for this date' };
    }

    // Step 4: Calculate ingredients needed using local Recipe data
    const ingredients = {
      breakfast: {},
      lunch: {},
      dinner: {}
    };

    // Store units separately so frontend knows how to display
    const ingredientUnits = {
      breakfast: {},
      lunch: {},
      dinner: {}
    };

    // Helper function to convert quantity based on unit
    const convertQty = (qty, unit) => {
      // Convert pieces to grams (1 piece = 60g)
      if (unit === 'piece' || unit === 'pieces') {
        return (qty * 60) / 1000; // Convert pieces to grams, then to kg
      }
      // For grams, convert to kg
      if (unit === 'g' || unit === 'gram' || unit === 'grams') {
        return qty / 1000; // Convert grams to kg for storage
      }
      // For other units (ml, ml, etc.), keep as-is
      return qty;
    };

    // Helper to get display unit (always kg for calculation display)
    const getDisplayUnit = (unit) => {
      return 'kg'; // Always display as kg
    };

    // Process breakfast items
    for (let item of menu.items?.breakfast || []) {
      const recipe = await Recipe.findOne({ name: item });
      if (!recipe) continue;

      recipe.ingredients.forEach(ing => {
        const totalQty = ing.qtyPerPerson * breakfastCount;
        const finalQty = totalQty + (totalQty * WASTAGE_PERCENT / 100);
        const convertedQty = convertQty(finalQty, ing.unit);
        const displayUnit = getDisplayUnit(ing.unit);
        
        ingredients.breakfast[ing.item] = (ingredients.breakfast[ing.item] || 0) + convertedQty;
        ingredientUnits.breakfast[ing.item] = displayUnit;
      });
    }

    // Process lunch items
    for (let item of menu.items?.lunch || []) {
      const recipe = await Recipe.findOne({ name: item });
      if (!recipe) continue;

      recipe.ingredients.forEach(ing => {
        const totalQty = ing.qtyPerPerson * lunchCount;
        const finalQty = totalQty + (totalQty * WASTAGE_PERCENT / 100);
        const convertedQty = convertQty(finalQty, ing.unit);
        const displayUnit = getDisplayUnit(ing.unit);
        
        ingredients.lunch[ing.item] = (ingredients.lunch[ing.item] || 0) + convertedQty;
        ingredientUnits.lunch[ing.item] = displayUnit;
      });
    }

    // Process dinner items
    for (let item of menu.items?.dinner || []) {
      const recipe = await Recipe.findOne({ name: item });
      if (!recipe) continue;

      recipe.ingredients.forEach(ing => {
        const totalQty = ing.qtyPerPerson * dinnerCount;
        const finalQty = totalQty + (totalQty * WASTAGE_PERCENT / 100);
        const convertedQty = convertQty(finalQty, ing.unit);
        const displayUnit = getDisplayUnit(ing.unit);
        
        ingredients.dinner[ing.item] = (ingredients.dinner[ing.item] || 0) + convertedQty;
        ingredientUnits.dinner[ing.item] = displayUnit;
      });
    }

    // Convert empty meal objects to null
    if (Object.keys(ingredients.breakfast).length === 0) ingredients.breakfast = null;
    if (Object.keys(ingredients.lunch).length === 0) ingredients.lunch = null;
    if (Object.keys(ingredients.dinner).length === 0) ingredients.dinner = null;

    // Step 5: Save calculation result to database
    const calculationData = await Calculation.findOneAndUpdate(
      { date },
      {
        date,
        breakfast: breakfastCount,
        lunch: lunchCount,
        dinner: dinnerCount,
        totalResponses: responses.length,
        ingredients,
        ingredientUnits,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Ensure fresh reads after background recalculation (consumer-triggered updates).
    await deleteCache(`calculation:${date}`);
    await deleteCache('calculation:history');

    console.log(`[CALCULATION] [OK] Calculation saved for ${date}`);

    return {
      success: true,
      message: 'Calculated and saved',
      data: {
        date: calculationData.date,
        totalResponses: calculationData.totalResponses,
        mealCounts: {
          breakfast: calculationData.breakfast,
          lunch: calculationData.lunch,
          dinner: calculationData.dinner
        },
        ingredients: calculationData.ingredients,
        ingredientUnits: calculationData.ingredientUnits,
        savedAt: calculationData.updatedAt
      }
    };

  } catch (error) {
    console.error(`[CALCULATION] [ERR] Error calculating meals for ${date}`);
    console.error(`[CALCULATION] Error type:`, error.code || error.name);
    console.error(`[CALCULATION] Error message:`, error.message);
    if (error.response) {
      console.error(`[CALCULATION] Response status:`, error.response.status);
      console.error(`[CALCULATION] Response data:`, error.response.data);
    } else if (error.request) {
      console.error(`[CALCULATION] No response received - request made but no reply`);
    } else {
      console.error(`[CALCULATION] Error details:`, error);
    }
    return {
      success: false,
      message: 'Error calculating meals',
      error: error.message
    };
  }
}

module.exports = { runCalculation };
