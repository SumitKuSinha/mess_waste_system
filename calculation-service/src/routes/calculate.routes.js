const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const Calculation = require('../models/calculation.model');
const { runCalculation } = require('../services/calculation.service');
const { setCache, getCache, deleteCache } = require('../config/redis');
require('dotenv').config();

const router = express.Router();

// Helper function to convert Maps to plain objects
function convertMapsToObjects(ingredients) {
  return {
    breakfast: ingredients?.breakfast instanceof Map 
      ? Object.fromEntries(ingredients.breakfast) 
      : (ingredients?.breakfast || {}),
    lunch: ingredients?.lunch instanceof Map 
      ? Object.fromEntries(ingredients.lunch) 
      : (ingredients?.lunch || {}),
    dinner: ingredients?.dinner instanceof Map 
      ? Object.fromEntries(ingredients.dinner) 
      : (ingredients?.dinner || {})
  };
}

// GET /api/calculate/history - Get all saved calculations (admin only) - FIRST!
router.get('/history', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const cacheKey = 'calculation:history';
    
    // Check cache first
    const cachedHistory = await getCache(cacheKey);
    if (cachedHistory) {
      console.log(`[OK] Calculation history cache hit`);
      return res.status(200).json({
        message: 'History retrieved',
        totalRecords: cachedHistory.length,
        data: cachedHistory
      });
    }

    // Get all calculations from database
    const calculations = await Calculation.find().sort({ date: -1 });

    const historyData = calculations.map(calc => {
      const convertedIngredients = convertMapsToObjects(calc.ingredients);
      return {
        date: calc.date,
        totalResponses: calc.totalResponses,
        mealCounts: {
          breakfast: calc.breakfast,
          lunch: calc.lunch,
          dinner: calc.dinner
        },
        breakfast: convertedIngredients.breakfast,
        lunch: convertedIngredients.lunch,
        dinner: convertedIngredients.dinner,
        savedAt: calc.updatedAt
      };
    });

    // Cache for 24 hours since history doesn't change often
    await setCache(cacheKey, historyData, 86400);
    console.log(`[OK] Calculation history cached`);

    res.status(200).json({
      message: 'History retrieved',
      totalRecords: calculations.length,
      data: historyData
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ message: 'Error fetching history', error: error.message });
  }
});

// GET /api/calculate/:date - Calculate total ingredients needed for a given date (admin & staff)
router.get('/:date', authMiddleware, roleMiddleware('admin', 'staff'), async (req, res) => {
  try {
    const { date } = req.params;
    const cacheKey = `calculation:${date}`;
    const forceRecalculate = String(req.query.force || '').toLowerCase() === 'true';

    // Check cache first unless force=true
    if (!forceRecalculate) {
      const cachedCalc = await getCache(cacheKey);
      if (cachedCalc) {
        console.log(`[OK] Calculation cache hit for ${date}`);
        return res.status(200).json({
          message: 'Calculation retrieved',
          data: cachedCalc
        });
      }
    }

    // First check if calculation exists in database (skip when force=true)
    const existingCalc = forceRecalculate ? null : await Calculation.findOne({ date });
    
    if (existingCalc) {
      // Return stored calculation with converted data
      const convertedIngredients = convertMapsToObjects(existingCalc.ingredients);
      
      const calcData = {
        date: existingCalc.date,
        totalResponses: existingCalc.totalResponses,
        mealCounts: {
          breakfast: existingCalc.breakfast,
          lunch: existingCalc.lunch,
          dinner: existingCalc.dinner
        },
        breakfast: convertedIngredients.breakfast,
        lunch: convertedIngredients.lunch,
        dinner: convertedIngredients.dinner,
        savedAt: existingCalc.updatedAt
      };

      // Cache for 24 hours
      await setCache(cacheKey, calcData, 86400);
      console.log(`[OK] Calculation cached for ${date}`);
      
      return res.status(200).json({
        message: 'Calculation retrieved',
        data: calcData
      });
    }

    // If not found in DB or force=true, run calculation
    const result = await runCalculation(date);

    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }

    // Convert the returned data
    const convertedIngredients = convertMapsToObjects(result.data.ingredients);

    const calcData = {
      date: result.data.date,
      totalResponses: result.data.totalResponses,
      mealCounts: result.data.mealCounts,
      breakfast: convertedIngredients.breakfast,
      lunch: convertedIngredients.lunch,
      dinner: convertedIngredients.dinner,
      savedAt: result.data.savedAt
    };

    // Cache for 24 hours
    await setCache(cacheKey, calcData, 86400);
    console.log(`[OK] Calculation cached for ${date}`);

    
    res.status(200).json({
      message: result.message,
      data: calcData
    });

  } catch (error) {
    console.error('Error calculating meals:', error.message);
    res.status(500).json({ message: 'Error calculating meals', error: error.message });
  }
});

// DELETE /api/calculate/:date - Delete calculation for a date (admin only)
router.delete('/:date', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { date } = req.params;

    const result = await Calculation.findOneAndDelete({ date });

    if (!result) {
      return res.status(404).json({ message: 'No calculation found for this date' });
    }

    await deleteCache(`calculation:${date}`);
    await deleteCache('calculation:history');

    res.status(200).json({ message: 'Calculation deleted successfully' });
  } catch (error) {
    console.error('Error deleting calculation:', error.message);
    res.status(500).json({ message: 'Error deleting calculation', error: error.message });
  }
});

module.exports = router;
