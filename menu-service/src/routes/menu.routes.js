const express = require("express");
const router = express.Router();
const Menu = require("../models/menu.model");
const authMiddleware = require("../middleware/auth");
const roleMiddleware = require("../middleware/role");

// add menu (admin only)
router.post("/add", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { date, items } = req.body;

    if (!date || !items) {
      return res.status(400).json({ error: "Date and items are required" });
    }

    const menu = await Menu.create({ date, items });

    res.status(201).json({ message: "Menu added", menu });
  } catch (error) {
    console.error("Error adding menu:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// get menu by date (public)
router.get("/:date", async (req, res) => {
  try {
    const menu = await Menu.findOne({ date: req.params.date });

    if (!menu) {
      return res.status(404).json({ message: "Menu not found for this date" });
    }

    res.json(menu);
  } catch (error) {
    console.error("Error fetching menu:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// get menu by date (public) - /get/:date variant
router.get("/get/:date", async (req, res) => {
  try {
    const menu = await Menu.findOne({ date: req.params.date });

    if (!menu) {
      return res.status(404).json({ message: "Menu not found for this date" });
    }

    res.json({
      date: menu.date,
      items: menu.items
    });
  } catch (error) {
    console.error("Error fetching menu:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// update menu (admin only)
router.put("/update", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { date, items } = req.body;

    if (!date || !items) {
      return res.status(400).json({ error: "Date and items are required" });
    }

    const updatedMenu = await Menu.findOneAndUpdate(
      { date },
      { items },
      { new: true }
    );

    if (!updatedMenu) {
      return res.status(404).json({ message: "Menu not found for this date" });
    }

    res.status(200).json({ message: "Menu updated", menu: updatedMenu });
  } catch (error) {
    console.error("Error updating menu:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// delete menu (admin only)
router.delete("/delete", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    const deletedMenu = await Menu.findOneAndDelete({ date });

    if (!deletedMenu) {
      return res.status(404).json({ message: "Menu not found for this date" });
    }

    res.status(200).json({ message: "Menu deleted successfully", menu: deletedMenu });
  } catch (error) {
    console.error("Error deleting menu:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
