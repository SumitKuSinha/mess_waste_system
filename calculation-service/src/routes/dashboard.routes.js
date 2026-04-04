const express = require('express');
const router = express.Router();
const Calculation = require('../models/calculation.model');
const Waste = require('../models/waste.model');
const { runCalculation } = require('../services/calculation.service');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

// Helper function to convert Map to plain object
function mapToObject(map) {
  if (!map) return {};
  if (map instanceof Map) {
    return Object.fromEntries(map);
  }
  if (typeof map === 'object') {
    const obj = {};
    for (const [key, value] of Object.entries(map)) {
      obj[key] = value;
    }
    return obj;
  }
  return {};
}

// GET /api/dashboard/:date - Get dashboard summary with waste analysis (admin only)
router.get('/:date', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { date } = req.params;

    // Keep dashboard in sync with latest responses/menu before rendering metrics.
    await runCalculation(date);

    // Step 1: Get calculation data
    const calculation = await Calculation.findOne({ date });
    if (!calculation) {
      return res.status(404).json({
        message: 'No calculation data found for this date'
      });
    }

    // Step 2: Get waste data
    const wasteData = await Waste.findOne({ date });
    if (!wasteData) {
      return res.status(404).json({
        message: 'No waste submission found for this date. Please submit v2 waste data first.'
      });
    }

    if (wasteData.inputType !== 'v2-bin-leftover') {
      return res.status(409).json({
        message: 'Legacy waste data found for this date. Please resubmit using v2 (bin waste + leftovers).'
      });
    }

    // Step 3: Convert Maps to plain objects safely
    const breakfastMap = mapToObject(calculation.ingredients?.breakfast);
    const lunchMap = mapToObject(calculation.ingredients?.lunch);
    const dinnerMap = mapToObject(calculation.ingredients?.dinner);

    // Step 4: Keep meal-wise separation
    const requiredIngredients = {
      breakfast: breakfastMap,
      lunch: lunchMap,
      dinner: dinnerMap
    };

    // Step 5: Calculate total ingredients (for waste percentage calculation)
    const totalIngredients = {};
    
    Object.entries(breakfastMap).forEach(([item, qty]) => {
      totalIngredients[item] = (totalIngredients[item] || 0) + qty;
    });
    
    Object.entries(lunchMap).forEach(([item, qty]) => {
      totalIngredients[item] = (totalIngredients[item] || 0) + qty;
    });
    
    Object.entries(dinnerMap).forEach(([item, qty]) => {
      totalIngredients[item] = (totalIngredients[item] || 0) + qty;
    });

    // Step 6: Calculate waste percentages and surplus against total
    const wastePercentage = {};
    const leftoverPercentage = {};
    const totalLossPercentage = {};
    const surplus = {};
    const wasteMap = mapToObject(wasteData?.waste);
    const leftoverMap = mapToObject(wasteData?.leftoverIngredients);
    let wasteMapFiltered = {};
    let leftoverMapFiltered = {};
    let totalLossMapFiltered = {};
    let surplusMapFiltered = {};

    // v2 mode: display waste, leftovers, and combined total loss separately
    for (let item in totalIngredients) {
      const required = totalIngredients[item] || 0;
      const wasteQty = wasteMap[item] || 0;
      const leftoverQty = leftoverMap[item] || 0;
      const totalLoss = wasteQty + leftoverQty;

      if (wasteQty > 0) {
        wasteMapFiltered[item] = wasteQty;
      }
      if (leftoverQty > 0) {
        leftoverMapFiltered[item] = leftoverQty;
      }
      if (totalLoss > 0) {
        totalLossMapFiltered[item] = totalLoss;
      }

      wastePercentage[item] = required > 0
        ? parseFloat(((wasteQty / required) * 100).toFixed(2))
        : 0;
      leftoverPercentage[item] = required > 0
        ? parseFloat(((leftoverQty / required) * 100).toFixed(2))
        : 0;
      totalLossPercentage[item] = required > 0
        ? parseFloat(((totalLoss / required) * 100).toFixed(2))
        : 0;
      surplus[item] = 0;
    }

    const totalWasteQuantity = Object.values(wasteMapFiltered).reduce((sum, val) => sum + (val || 0), 0);
    const totalLeftoverQuantity = Object.values(leftoverMapFiltered).reduce((sum, val) => sum + (val || 0), 0);
    const totalLossQuantity = Object.values(totalLossMapFiltered).reduce((sum, val) => sum + (val || 0), 0);
    const totalSurplusQuantity = Object.values(surplusMapFiltered).reduce((sum, val) => sum + (val || 0), 0);
    const totalRequiredQuantity = Object.values(totalIngredients).reduce((sum, val) => sum + (val || 0), 0);

    const overallWastePercentage = totalRequiredQuantity > 0
      ? parseFloat(((totalWasteQuantity / totalRequiredQuantity) * 100).toFixed(2))
      : 0;
    const overallLeftoverPercentage = totalRequiredQuantity > 0
      ? parseFloat(((totalLeftoverQuantity / totalRequiredQuantity) * 100).toFixed(2))
      : 0;
    const overallLossPercentage = totalRequiredQuantity > 0
      ? parseFloat(((totalLossQuantity / totalRequiredQuantity) * 100).toFixed(2))
      : 0;
    
    const wastePercentageValues = Object.values(wastePercentage).filter(val => val > 0);
    const averageWastePercentage = wastePercentageValues.length > 0
      ? parseFloat((wastePercentageValues.reduce((a, b) => a + b, 0) / wastePercentageValues.length).toFixed(2))
      : 0;
    
    const topWastedItem = Object.entries(wasteMapFiltered).length > 0
      ? Object.entries(wasteMapFiltered).reduce((max, [item, qty]) => (qty > max.quantity ? { item, quantity: qty } : max), { item: null, quantity: 0 })
      : { item: null, quantity: 0 };

    const topSurplusItem = Object.entries(surplusMapFiltered).length > 0
      ? Object.entries(surplusMapFiltered).reduce((max, [item, qty]) => (qty > max.quantity ? { item, quantity: qty } : max), { item: null, quantity: 0 })
      : { item: null, quantity: 0 };

    const topLeftoverItem = Object.entries(leftoverMapFiltered).length > 0
      ? Object.entries(leftoverMapFiltered).reduce((max, [item, qty]) => (qty > max.quantity ? { item, quantity: qty } : max), { item: null, quantity: 0 })
      : { item: null, quantity: 0 };

    const topLossItem = Object.entries(totalLossMapFiltered).length > 0
      ? Object.entries(totalLossMapFiltered).reduce((max, [item, qty]) => (qty > max.quantity ? { item, quantity: qty } : max), { item: null, quantity: 0 })
      : { item: null, quantity: 0 };

    const recipeWasteByMeal = {
      breakfast: mapToObject(wasteData?.recipeWaste?.breakfast),
      lunch: mapToObject(wasteData?.recipeWaste?.lunch),
      dinner: mapToObject(wasteData?.recipeWaste?.dinner)
    };

    const recipeWasteFlat = [];
    Object.entries(recipeWasteByMeal).forEach(([meal, mealRecipes]) => {
      Object.entries(mealRecipes || {}).forEach(([recipe, qty]) => {
        const numericQty = Number(qty || 0);
        if (numericQty > 0) {
          recipeWasteFlat.push({ meal, recipe, quantity: parseFloat(numericQty.toFixed(2)) });
        }
      });
    });

    const topWastedRecipe = recipeWasteFlat.length > 0
      ? recipeWasteFlat.reduce((max, curr) => (curr.quantity > max.quantity ? curr : max), { meal: null, recipe: null, quantity: 0 })
      : { meal: null, recipe: null, quantity: 0 };

    const highWasteItems = Object.entries(wastePercentage)
      .filter(([_, percent]) => percent > 10)
      .map(([item, percent]) => ({ item, wastePercent: percent }));

    res.status(200).json({
      message: 'Dashboard data retrieved',
      data: {
        date,
        totalResponses: calculation.totalResponses,
        mealCounts: {
          breakfast: calculation.breakfast,
          lunch: calculation.lunch,
          dinner: calculation.dinner
        },
        requiredIngredients,
        totalIngredients,
        wasteInputType: wasteData?.inputType || 'v2-bin-leftover',
        recipeWaste: recipeWasteByMeal,
        waste: wasteMapFiltered,
        leftovers: leftoverMapFiltered,
        totalLoss: totalLossMapFiltered,
        surplus: surplusMapFiltered,
        wastePercentage,
        leftoverPercentage,
        totalLossPercentage,
        totalWasteBinWeight: wasteData?.totalWasteBin || 0,
        summary: {
          waste: {
            totalWasteItems: Object.keys(wasteMapFiltered).length,
            totalWasteQuantity: parseFloat(totalWasteQuantity.toFixed(2)),
            overallWastePercentage,
            averageWastePercentage,
            highWasteItems,
            topWastedItem: topWastedItem.item ? topWastedItem : null,
            topWastedRecipe: topWastedRecipe.recipe ? topWastedRecipe : null
          },
          leftovers: {
            totalLeftoverItems: Object.keys(leftoverMapFiltered).length,
            totalLeftoverQuantity: parseFloat(totalLeftoverQuantity.toFixed(2)),
            overallLeftoverPercentage,
            topLeftoverItem: topLeftoverItem.item ? topLeftoverItem : null
          },
          totalLoss: {
            totalLossItems: Object.keys(totalLossMapFiltered).length,
            totalLossQuantity: parseFloat(totalLossQuantity.toFixed(2)),
            overallLossPercentage,
            topLossItem: topLossItem.item ? topLossItem : null
          },
          surplus: {
            totalSurplusItems: Object.keys(surplusMapFiltered).length,
            totalSurplusQuantity: parseFloat(totalSurplusQuantity.toFixed(2)),
            topSurplusItem: topSurplusItem.item ? topSurplusItem : null
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error.message);
    res.status(500).json({
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

module.exports = router;
