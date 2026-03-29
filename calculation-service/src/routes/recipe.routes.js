const express = require('express');
const router = express.Router();
const Recipe = require('../models/recipe.model');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

// Default recipes for all fixed menu items
const DEFAULT_RECIPES = [
  // Breakfast items
  { name: 'Rice', category: 'breakfast', ingredients: [{ item: 'Rice', qtyPerPerson: 100 }, { item: 'Oil', qtyPerPerson: 10 }, { item: 'Salt', qtyPerPerson: 2 }] },
  { name: 'Dosa', category: 'breakfast', ingredients: [{ item: 'Rice Flour', qtyPerPerson: 80 }, { item: 'Urad Flour', qtyPerPerson: 20 }, { item: 'Oil', qtyPerPerson: 15 }] },
  { name: 'Idli', category: 'breakfast', ingredients: [{ item: 'Rice Flour', qtyPerPerson: 50 }, { item: 'Urad Flour', qtyPerPerson: 30 }, { item: 'Salt', qtyPerPerson: 2 }] },
  { name: 'Poha', category: 'breakfast', ingredients: [{ item: 'Poha', qtyPerPerson: 80 }, { item: 'Onion', qtyPerPerson: 50 }, { item: 'Oil', qtyPerPerson: 10 }, { item: 'Salt', qtyPerPerson: 2 }] },
  { name: 'Upma', category: 'breakfast', ingredients: [{ item: 'Semolina', qtyPerPerson: 60 }, { item: 'Carrot', qtyPerPerson: 30 }, { item: 'Onion', qtyPerPerson: 30 }, { item: 'Oil', qtyPerPerson: 10 }] },
  { name: 'Puri', category: 'breakfast', ingredients: [{ item: 'Flour', qtyPerPerson: 60 }, { item: 'Oil', qtyPerPerson: 25 }, { item: 'Salt', qtyPerPerson: 2 }] },
  { name: 'Paratha', category: 'breakfast', ingredients: [{ item: 'Flour', qtyPerPerson: 80 }, { item: 'Ghee', qtyPerPerson: 15 }, { item: 'Salt', qtyPerPerson: 2 }] },
  { name: 'Bread Butter', category: 'breakfast', ingredients: [{ item: 'Bread', qtyPerPerson: 100 }, { item: 'Butter', qtyPerPerson: 20 }] },

  // Lunch items
  { name: 'Dal Rice', category: 'lunch', ingredients: [{ item: 'Rice', qtyPerPerson: 100 }, { item: 'Dal', qtyPerPerson: 40 }, { item: 'Onion', qtyPerPerson: 30 }, { item: 'Oil', qtyPerPerson: 15 }, { item: 'Salt', qtyPerPerson: 2 }] },
  { name: 'Chicken Curry', category: 'lunch', ingredients: [{ item: 'Chicken', qtyPerPerson: 120 }, { item: 'Onion', qtyPerPerson: 50 }, { item: 'Tomato', qtyPerPerson: 40 }, { item: 'Spices', qtyPerPerson: 10 }, { item: 'Oil', qtyPerPerson: 20 }] },
  { name: 'Veg Curry', category: 'lunch', ingredients: [{ item: 'Mixed Vegetables', qtyPerPerson: 150 }, { item: 'Onion', qtyPerPerson: 50 }, { item: 'Tomato', qtyPerPerson: 40 }, { item: 'Spices', qtyPerPerson: 10 }, { item: 'Oil', qtyPerPerson: 15 }] },
  { name: 'Fish Curry', category: 'lunch', ingredients: [{ item: 'Fish', qtyPerPerson: 100 }, { item: 'Onion', qtyPerPerson: 50 }, { item: 'Tomato', qtyPerPerson: 40 }, { item: 'Spices', qtyPerPerson: 10 }, { item: 'Oil', qtyPerPerson: 20 }, { item: 'Coconut Milk', qtyPerPerson: 50 }] },
  { name: 'Roti', category: 'lunch', ingredients: [{ item: 'Flour', qtyPerPerson: 80 }, { item: 'Oil', qtyPerPerson: 5 }, { item: 'Salt', qtyPerPerson: 1 }] },
  { name: 'Biryani', category: 'lunch', ingredients: [{ item: 'Rice', qtyPerPerson: 120 }, { item: 'Chicken', qtyPerPerson: 100 }, { item: 'Onion', qtyPerPerson: 80 }, { item: 'Spices', qtyPerPerson: 15 }, { item: 'Oil', qtyPerPerson: 25 }, { item: 'Yogurt', qtyPerPerson: 30 }] },
  { name: 'Sambhar', category: 'lunch', ingredients: [{ item: 'Mixed Vegetables', qtyPerPerson: 120 }, { item: 'Dal', qtyPerPerson: 30 }, { item: 'Spices', qtyPerPerson: 10 }, { item: 'Oil', qtyPerPerson: 10 }] },
  { name: 'Rasam', category: 'lunch', ingredients: [{ item: 'Tomato', qtyPerPerson: 80 }, { item: 'Tamarind', qtyPerPerson: 10 }, { item: 'Spices', qtyPerPerson: 8 }, { item: 'Oil', qtyPerPerson: 5 }] },

  // Dinner items
  { name: 'Rice Curry', category: 'dinner', ingredients: [{ item: 'Rice', qtyPerPerson: 100 }, { item: 'Mixed Vegetables', qtyPerPerson: 80 }, { item: 'Oil', qtyPerPerson: 15 }, { item: 'Salt', qtyPerPerson: 2 }] },
  { name: 'Noodles', category: 'dinner', ingredients: [{ item: 'Noodles', qtyPerPerson: 100 }, { item: 'Vegetables', qtyPerPerson: 80 }, { item: 'Soy Sauce', qtyPerPerson: 10 }, { item: 'Oil', qtyPerPerson: 10 }] },
  { name: 'Pasta', category: 'dinner', ingredients: [{ item: 'Pasta', qtyPerPerson: 120 }, { item: 'Tomato Sauce', qtyPerPerson: 100 }, { item: 'Vegetables', qtyPerPerson: 60 }, { item: 'Oil', qtyPerPerson: 10 }] },
  { name: 'Khichdi', category: 'dinner', ingredients: [{ item: 'Rice', qtyPerPerson: 80 }, { item: 'Dal', qtyPerPerson: 30 }, { item: 'Vegetables', qtyPerPerson: 60 }, { item: 'Ghee', qtyPerPerson: 10 }, { item: 'Salt', qtyPerPerson: 2 }] },
  { name: 'Pulao', category: 'dinner', ingredients: [{ item: 'Rice', qtyPerPerson: 120 }, { item: 'Vegetables', qtyPerPerson: 100 }, { item: 'Spices', qtyPerPerson: 8 }, { item: 'Oil', qtyPerPerson: 15 }] },
  { name: 'Fried Rice', category: 'dinner', ingredients: [{ item: 'Rice', qtyPerPerson: 120 }, { item: 'Vegetables', qtyPerPerson: 100 }, { item: 'Egg', qtyPerPerson: 100 }, { item: 'Soy Sauce', qtyPerPerson: 10 }, { item: 'Oil', qtyPerPerson: 20 }] }
];

// Seed recipes (admin only)
router.post('/seed', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    // Clear existing recipes
    await Recipe.deleteMany({});

    // Insert default recipes
    const createdRecipes = await Recipe.insertMany(DEFAULT_RECIPES);

    res.status(201).json({
      message: `✅ Seeded ${createdRecipes.length} recipes successfully`,
      count: createdRecipes.length
    });
  } catch (error) {
    console.error('Error seeding recipes:', error);
    res.status(500).json({ message: 'Error seeding recipes', error: error.message });
  }
});

// Get all recipes
router.get('/', async (req, res) => {
  try {
    const recipes = await Recipe.find({});
    res.status(200).json({
      message: 'Recipes retrieved',
      count: recipes.length,
      data: recipes
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recipes', error: error.message });
  }
});

// Add single recipe (admin only)
router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { name, category, ingredients } = req.body;

    if (!name || !category || !ingredients) {
      return res.status(400).json({ message: 'Name, category, and ingredients are required' });
    }

    const recipe = await Recipe.create({ name, category, ingredients });

    res.status(201).json({
      message: 'Recipe created successfully',
      data: recipe
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Recipe with this name already exists' });
    }
    res.status(500).json({ message: 'Error creating recipe', error: error.message });
  }
});

module.exports = router;
