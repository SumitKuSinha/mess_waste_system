const express = require('express');
const router = express.Router();
const Waste = require('../models/waste.model');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

// POST /api/waste/add - Save waste data (staff/admin only)
router.post('/add', authMiddleware, roleMiddleware('staff', 'admin'), async (req, res) => {
  console.log("HEADERS:", req.headers.authorization);
  console.log("USER:", req.user);
  try {
    const { date, waste } = req.body;

    // Validation
    if (!date || !waste) {
      return res.status(400).json({
        message: 'Date and waste data are required'
      });
    }

    const newWaste = new Waste({ date, waste });
    await newWaste.save();

    res.status(201).json({
      message: 'Waste recorded',
      data: newWaste
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error saving waste',
      error: error.message
    });
  }
});

// GET /api/waste/:date - Get waste data for a date (admin only)
router.get('/:date', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { date } = req.params;

    const wasteData = await Waste.findOne({ date });

    if (!wasteData) {
      return res.status(404).json({
        message: 'No waste data found for this date'
      });
    }

    res.status(200).json({
      message: 'Waste data retrieved',
      data: wasteData
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving waste data',
      error: error.message
    });
  }
});

module.exports = router;
