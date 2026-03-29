const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const Calculation = require('../models/calculation.model');
const { runCalculation } = require('../services/calculation.service');
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
    // Get all calculations from database
    const calculations = await Calculation.find().sort({ date: -1 });

    res.status(200).json({
      message: 'History retrieved',
      totalRecords: calculations.length,
      data: calculations.map(calc => {
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
      })
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ message: 'Error fetching history', error: error.message });
  }
});

// GET /api/calculate/:date - Calculate total ingredients needed for a given date
router.get('/:date', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { date } = req.params;

    // First check if calculation exists in database
    const existingCalc = await Calculation.findOne({ date });
    
    if (existingCalc) {
      // Return stored calculation with converted data
      const convertedIngredients = convertMapsToObjects(existingCalc.ingredients);
      
      return res.status(200).json({
        message: 'Calculation retrieved',
        data: {
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
        }
      });
    }

    // If not found in DB, run calculation
    const result = await runCalculation(date);

    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }

    // Convert the returned data
    const convertedIngredients = convertMapsToObjects(result.data.ingredients);

    res.status(200).json({
      message: result.message,
      data: {
        date: result.data.date,
        totalResponses: result.data.totalResponses,
        mealCounts: result.data.mealCounts,
        breakfast: convertedIngredients.breakfast,
        lunch: convertedIngredients.lunch,
        dinner: convertedIngredients.dinner,
        savedAt: result.data.savedAt
      }
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

    res.status(200).json({ message: 'Calculation deleted successfully' });
  } catch (error) {
    console.error('Error deleting calculation:', error.message);
    res.status(500).json({ message: 'Error deleting calculation', error: error.message });
  }
});

module.exports = router;
