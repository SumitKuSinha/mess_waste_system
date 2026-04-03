const express = require("express");
const router = express.Router();

const Response = require("../models/response.model");
const authMiddleware = require("../middleware/auth");
const { sendToQueue } = require("../utils/rabbitmq");
const { setCache, getCache, deleteCache } = require("../config/redis");

// submit response
router.post("/submit", authMiddleware, async (req, res) => {
  try {
    const { date, meals } = req.body;
    const studentId = req.user.id;

    // Role check: Only students can submit responses
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can submit response" });
    }

    // Time lock: Allow responses only between 9 AM (09:00) and 9 PM (21:00)
    const now = new Date();
    const hour = now.getHours();

    if (hour < 9 || hour >= 21) {
      return res.status(403).json({ message: "Responses allowed only between 9 AM and 9 PM" });
    }

    // Validation: Check if date and meals are provided
    if (!date || !meals) {
      return res.status(400).json({ message: "Missing data: date and meals are required" });
    }

    // Validation: Check if meal values are valid
    const validMealValues = ["full", "half", "none"];
    
    for (let mealType in meals) {
      if (!validMealValues.includes(meals[mealType])) {
        return res.status(400).json({ 
          message: `Invalid meal value for ${mealType}. Must be 'full', 'half', or 'none'` 
        });
      }
    }

    // Duplicate check: Prevent multiple submissions for same date
    const existing = await Response.findOne({
      studentId: req.user.id,
      date
    });

    if (existing) {
      return res.status(400).json({
        message: "You already submitted response for this date"
      });
    }

    const response = await Response.create({
      studentId,
      date,
      meals,
    });

    // Clear caches affected by the new submission
    await deleteCache(`responses:${date}`);
    await deleteCache(`responses:my-all:${studentId}`);
    await deleteCache(`response:my:${studentId}:${date}`);
    console.log(`[OK] Response cache cleared for ${date}`);

    // Send message to RabbitMQ for calculation service
    sendToQueue({
      type: "NEW_RESPONSE",
      date: date,
      studentId: studentId,
      meals: meals
    });

    res.status(201).json({ message: "Response saved", response });
  } catch (error) {
    res.status(500).json({ message: "Error saving response" });
  }
});

// get all responses for current student
router.get("/my-all", authMiddleware, async (req, res) => {
  try {
    const studentId = req.user.id;
    const cacheKey = `responses:my-all:${studentId}`;

    // Check cache first
    const cachedResponses = await getCache(cacheKey);
    if (cachedResponses) {
      console.log(`[OK] Student responses cache hit for ${studentId}`);
      if (!cachedResponses || cachedResponses.length === 0) {
        return res.status(200).json([]);
      }
      return res.json(cachedResponses);
    }

    const responses = await Response.find({ studentId }).sort({ date: -1 });

    if (!responses || responses.length === 0) {
      return res.status(200).json([]);
    }

    // Cache for 1 hour
    await setCache(cacheKey, responses, 3600);
    console.log(`[OK] Student responses cached for ${studentId}`);

    res.json(responses);
  } catch (error) {
    res.status(500).json({ message: "Error fetching responses" });
  }
});

// get student response for specific date
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const studentId = req.user.id;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const cacheKey = `response:my:${studentId}:${date}`;

    // Check cache first
    const cachedResponse = await getCache(cacheKey);
    if (cachedResponse) {
      console.log(`[OK] Response cache hit for ${studentId}:${date}`);
      return res.json(cachedResponse);
    }

    const response = await Response.findOne({
      studentId,
      date,
    });

    if (!response) {
      return res.status(404).json({ message: "No response found for this date" });
    }

    const responseData = {
      date: response.date,
      meals: response.meals,
    };

    // Cache for 24 hours
    await setCache(cacheKey, responseData, 86400);
    console.log(`[OK] Response cached for ${studentId}:${date}`);

    res.json(responseData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching response" });
  }
});

// update response
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const { date, meals } = req.body;
    const studentId = req.user.id;

    // Role check: Only students can update responses
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can update response" });
    }

    // Time lock: Allow responses only between 9 AM (09:00) and 9 PM (21:00)
    const now = new Date();
    const hour = now.getHours();

    if (hour < 9 || hour >= 21) {
      return res.status(403).json({ message: "Responses allowed only between 9 AM and 9 PM" });
    }

    // Validation: Check if date and meals are provided
    if (!date || !meals) {
      return res.status(400).json({ message: "Missing data: date and meals are required" });
    }

    // Validation: Check if meal values are valid
    const validMealValues = ["full", "half", "none"];
    
    for (let mealType in meals) {
      if (!validMealValues.includes(meals[mealType])) {
        return res.status(400).json({ 
          message: `Invalid meal value for ${mealType}. Must be 'full', 'half', or 'none'` 
        });
      }
    }

    // Update response if it exists
    const updated = await Response.findOneAndUpdate(
      { studentId, date },
      { meals },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "No response found for this date" });
    }

    // Clear cache for this response
    await deleteCache(`response:my:${studentId}:${date}`);
    await deleteCache(`responses:my-all:${studentId}`);
    await deleteCache(`responses:${date}`);
    console.log(`[OK] Response cache cleared for ${date}`);

    // Trigger recalculation for this date
    sendToQueue({
      type: 'UPDATE_RESPONSE',
      date,
      studentId,
      meals
    });

    res.status(200).json({ message: "Response updated", response: updated });
  } catch (error) {
    res.status(500).json({ message: "Error updating response" });
  }
});

// get all responses for a date (for calculation service)
router.get('/all', async (req, res) => {
  try {
    const { date } = req.query;
    const forceFresh = req.query.force === 'true';

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const cacheKey = `responses:${date}`;

    // Check cache first unless force refresh requested
    if (!forceFresh) {
      const cachedResponses = await getCache(cacheKey);
      if (cachedResponses) {
        console.log(`[OK] Responses cache hit for ${date}`);
        return res.status(200).json({
          message: "Responses retrieved",
          total: cachedResponses.length,
          data: cachedResponses
        });
      }
    }

    const responses = await Response.find({ date });

    // Cache for 24 hours
    await setCache(cacheKey, responses, 86400);
    console.log(`[OK] Responses cached for ${date}`);

    res.status(200).json({
      message: "Responses retrieved",
      total: responses.length,
      data: responses
    });
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ message: "Error fetching responses" });
  }
});

// delete response
router.delete("/delete", authMiddleware, async (req, res) => {
  try {
    const { date } = req.body;
    const studentId = req.user.id;

    // Role check: Only students can delete their responses
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can delete their response" });
    }

    // Validation: Check if date is provided
    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    // Delete response if it exists
    const deleted = await Response.findOneAndDelete(
      { studentId, date }
    );

    if (!deleted) {
      return res.status(404).json({ message: "No response found for this date" });
    }

    // Clear cache for this date
    await deleteCache(`response:my:${studentId}:${date}`);
    await deleteCache(`responses:my-all:${studentId}`);
    await deleteCache(`responses:${date}`);

    // Trigger recalculation for this date
    sendToQueue({
      type: 'DELETE_RESPONSE',
      date,
      studentId
    });

    res.status(200).json({ message: "Response deleted successfully", response: deleted });
  } catch (error) {
    res.status(500).json({ message: "Error deleting response", error: error.message });
  }
});

module.exports = router;