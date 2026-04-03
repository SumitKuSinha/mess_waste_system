const express = require("express");
const router = express.Router();
const { signup, login } = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { setCache, getCache, deleteCache } = require("../config/redis");

router.post("/signup", signup);
router.post("/login", login);

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const cacheKey = `user:profile:${req.user.id}`;
    
    // Check cache first
    const cachedUser = await getCache(cacheKey);
    if (cachedUser) {
      console.log(`[OK] User profile cache hit for ${req.user.id}`);
      return res.json({
        message: "Protected route",
        user: cachedUser,
      });
    }

    // If not in cache, fetch from DB and cache it
    const userData = req.user;
    await setCache(cacheKey, userData, 3600); // Cache for 1 hour
    console.log(`[OK] User profile cached for ${req.user.id}`);

    res.json({
      message: "Protected route",
      user: userData,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify token contents
router.get("/verify-token", authMiddleware, async (req, res) => {
  try {
    const cacheKey = `user:token:${req.user.id}`;
    
    // Check cache first
    const cachedToken = await getCache(cacheKey);
    if (cachedToken) {
      console.log(`[OK] Token verification cache hit for ${req.user.id}`);
      return res.json({
        message: "Token verified",
        tokenContents: cachedToken,
      });
    }

    // If not in cache, cache it
    const tokenData = req.user;
    await setCache(cacheKey, tokenData, 3600); // Cache for 1 hour
    console.log(`[OK] Token verification cached for ${req.user.id}`);

    res.json({
      message: "Token verified",
      tokenContents: tokenData,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role (for testing)
router.post("/update-role/:email/:newRole", async (req, res) => {
  try {
    const { email, newRole } = req.params;
    const validRoles = ["student", "staff", "admin"];
    
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { role: newRole },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Clear cache for this user
    await deleteCache(`user:profile:${user._id}`);
    await deleteCache(`user:token:${user._id}`);
    console.log(`[OK] User cache cleared for ${email}`);

    res.json({
      message: "User role updated",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// only admin can access
router.get(
  "/admin",
  authMiddleware,
  roleMiddleware("admin"),
  (req, res) => {
    res.json({ message: "Welcome Admin" });
  }
);

// staff and admin can access
router.get(
  "/staff",
  authMiddleware,
  roleMiddleware("staff", "admin"),
  (req, res) => {
    res.json({ message: "Welcome Staff/Admin" });
  }
);

module.exports = router;
