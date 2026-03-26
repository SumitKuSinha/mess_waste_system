const express = require("express");
const router = express.Router();
const { signup, login } = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

router.post("/signup", signup);
router.post("/login", login);

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    message: "Protected route",
    user: req.user,
  });
});

// Verify token contents
router.get("/verify-token", authMiddleware, (req, res) => {
  res.json({
    message: "Token verified",
    tokenContents: req.user,
  });
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
