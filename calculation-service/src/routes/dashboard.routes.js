const express = require('express');
const router = express.Router();
const Calculation = require('../models/calculation.model');
const Waste = require('../models/waste.model');
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

    // Step 1: Get calculation data
    const calculation = await Calculation.findOne({ date });
    if (!calculation) {
      return res.status(404).json({
        message: 'No calculation data found for this date'
      });
    }

    // Step 2: Get waste data
    const wasteData = await Waste.findOne({ date });

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

    // Step 6: Calculate waste percentages against total
    const wastePercentage = {};
    const wasteMap = mapToObject(wasteData?.waste);

    for (let item in totalIngredients) {
      const required = totalIngredients[item] || 0;
      const wasted = wasteMap[item] || 0;

      wastePercentage[item] = required > 0 
        ? parseFloat(((wasted / required) * 100).toFixed(2))
        : 0;
    }

    // Step 7: Calculate advanced summary metrics
    const totalWasteQuantity = Object.values(wasteMap).reduce((sum, val) => sum + (val || 0), 0);
    const wastePercentageValues = Object.values(wastePercentage).filter(val => val > 0);
    const averageWastePercentage = wastePercentageValues.length > 0
      ? parseFloat((wastePercentageValues.reduce((a, b) => a + b, 0) / wastePercentageValues.length).toFixed(2))
      : 0;
    
    const topWastedItem = Object.entries(wasteMap).length > 0
      ? Object.entries(wasteMap).reduce((max, [item, qty]) => (qty > max.quantity ? { item, quantity: qty } : max), { item: null, quantity: 0 })
      : { item: null, quantity: 0 };

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
        waste: wasteMap,
        wastePercentage,
        summary: {
          totalWasteItems: Object.keys(wasteMap).length,
          totalWasteQuantity: parseFloat(totalWasteQuantity.toFixed(2)),
          averageWastePercentage,
          highWasteItems,
          topWastedItem: topWastedItem.item ? topWastedItem : null
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
