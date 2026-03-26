const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const Calculation = require('../models/calculation.model');
const { runCalculation } = require('../services/calculation.service');
require('dotenv').config();

const router = express.Router();

// GET /api/calculate/history - Get all saved calculations (admin only) - FIRST!
router.get('/history', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    // Get all calculations from database
    const calculations = await Calculation.find().sort({ date: -1 });

    res.status(200).json({
      message: 'History retrieved',
      totalRecords: calculations.length,
      data: calculations.map(calc => {
        const ingredients = {
          breakfast: Object.keys(calc.ingredients?.breakfast || {}).length > 0 ? calc.ingredients.breakfast : null,
          lunch: Object.keys(calc.ingredients?.lunch || {}).length > 0 ? calc.ingredients.lunch : null,
          dinner: Object.keys(calc.ingredients?.dinner || {}).length > 0 ? calc.ingredients.dinner : null
        };
        return {
          date: calc.date,
          totalResponses: calc.totalResponses,
          mealCounts: {
            breakfast: calc.breakfast,
            lunch: calc.lunch,
            dinner: calc.dinner
          },
          ingredients,
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

    // Use shared calculation service
    const result = await runCalculation(date);

    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }

    res.status(200).json({
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error calculating meals:', error.message);
    res.status(500).json({ message: 'Error calculating meals', error: error.message });
  }
});

module.exports = router;
