const express = require('express');
const axios = require('axios');
const router = express.Router();
const Waste = require('../models/waste.model');
const Calculation = require('../models/calculation.model');
const Recipe = require('../models/recipe.model');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

const WASTAGE_PERCENT = 10;

function convertQty(qty, unit) {
  if (unit === 'piece' || unit === 'pieces') {
    return (qty * 60) / 1000;
  }
  if (unit === 'g' || unit === 'gram' || unit === 'grams') {
    return qty / 1000;
  }
  return qty;
}

function toNumberMap(obj) {
  const out = {};
  Object.entries(obj || {}).forEach(([k, v]) => {
    const num = Number(v);
    if (!Number.isNaN(num)) out[k] = num;
  });
  return out;
}

// POST /api/waste/add - Save waste data (staff only)
router.post('/add', authMiddleware, roleMiddleware('staff'), async (req, res) => {
  try {
    const { date, waste, recipeWaste, totalWasteBin, leftovers, inputType } = req.body;

    // V2 PATH FIRST (check before legacy validation) - total bin waste + per-dish leftovers, system estimates per-recipe waste distribution
    if (inputType === 'v2-bin-leftover') {
      // Validation
      if (!date) {
        return res.status(400).json({
          message: 'Date is required'
        });
      }
      if (totalWasteBin === undefined || totalWasteBin === null || Number.isNaN(Number(totalWasteBin))) {
        return res.status(400).json({
          message: 'totalWasteBin (in kg) is required'
        });
      }
      if (totalWasteBin < 0) {
        return res.status(400).json({
          message: 'totalWasteBin cannot be negative'
        });
      }

      const calculation = await Calculation.findOne({ date });
      if (!calculation) {
        return res.status(400).json({
          message: 'No calculation found for this date. Please run calculation first.'
        });
      }

      let menuData;
      try {
        const menuRes = await axios.get(`http://localhost:5002/api/menu/get/${date}`, {
          timeout: 5000
        });
        menuData = menuRes.data;
      } catch (menuError) {
        return res.status(500).json({
          message: 'Unable to fetch menu for waste conversion',
          error: menuError.message
        });
      }

      const normalizedLeftovers = {
        breakfast: toNumberMap(leftovers?.breakfast),
        lunch: toNumberMap(leftovers?.lunch),
        dinner: toNumberMap(leftovers?.dinner)
      };

      // Step 1: Calculate ingredient-level leftovers
      const leftoverIngredientsMap = {};
      const meals = ['breakfast', 'lunch', 'dinner'];

      for (const meal of meals) {
        const mealCount = Number(calculation[meal] || 0);
        const recipeNames = menuData?.items?.[meal] || [];

        for (const recipeName of recipeNames) {
          const leftoverKg = Number(normalizedLeftovers[meal]?.[recipeName] || 0);
          if (!leftoverKg || leftoverKg <= 0) continue;

          const recipe = await Recipe.findOne({ name: recipeName });
          if (!recipe) continue;

          // Calculate total planned qty for this recipe
          let recipePlannedQtyKg = 0;
          const ingredientPlannedKg = [];

          recipe.ingredients.forEach((ing) => {
            const baseQty = ing.qtyPerPerson * mealCount;
            const plannedQty = baseQty + (baseQty * WASTAGE_PERCENT / 100);
            const plannedQtyInKg = convertQty(plannedQty, ing.unit);
            recipePlannedQtyKg += plannedQtyInKg;
            ingredientPlannedKg.push({ item: ing.item, qtyKg: plannedQtyInKg });
          });

          if (recipePlannedQtyKg <= 0) continue;

          // Distribute leftover proportionally to ingredients
          const leftoverRatio = leftoverKg / recipePlannedQtyKg;
          ingredientPlannedKg.forEach((ing) => {
            const ingredientLeftoverQty = ing.qtyKg * leftoverRatio;
            leftoverIngredientsMap[ing.item] = (leftoverIngredientsMap[ing.item] || 0) + ingredientLeftoverQty;
          });
        }
      }

      // Step 2: Calculate served quantity per recipe = expected - leftover
      const servedQtyByRecipe = {};
      let totalServed = 0;
      const estimatedRecipeWaste = {
        breakfast: {},
        lunch: {},
        dinner: {}
      };

      for (const meal of meals) {
        const mealCount = Number(calculation[meal] || 0);
        const recipeNames = menuData?.items?.[meal] || [];

        for (const recipeName of recipeNames) {
          const recipe = await Recipe.findOne({ name: recipeName });
          if (!recipe) continue;

          let recipePlannedQtyKg = 0;
          recipe.ingredients.forEach((ing) => {
            const baseQty = ing.qtyPerPerson * mealCount;
            const plannedQty = baseQty + (baseQty * WASTAGE_PERCENT / 100);
            const plannedQtyInKg = convertQty(plannedQty, ing.unit);
            recipePlannedQtyKg += plannedQtyInKg;
          });

          if (recipePlannedQtyKg <= 0) continue;

          const leftoverKg = Number(normalizedLeftovers[meal]?.[recipeName] || 0);
          const servedQty = Math.max(0, recipePlannedQtyKg - leftoverKg);
          servedQtyByRecipe[recipeName] = servedQty;
          totalServed += servedQty;
        }
      }

      // Step 3: Distribute totalWasteBin proportionally across recipes based on served qty
      if (totalServed > 0) {
        for (const meal of meals) {
          const mealCount = Number(calculation[meal] || 0);
          const recipeNames = menuData?.items?.[meal] || [];

          for (const recipeName of recipeNames) {
            const servedQty = servedQtyByRecipe[recipeName] || 0;
            if (servedQty <= 0) continue;

            const wasteRatio = servedQty / totalServed;
            const estimatedWasteForRecipe = totalWasteBin * wasteRatio;
            estimatedRecipeWaste[meal][recipeName] = Number(estimatedWasteForRecipe.toFixed(4));
          }
        }
      }

      // Step 4: Derive ingredient-level waste from estimated recipe waste
      const derivedIngredientWaste = {};

      for (const meal of meals) {
        const mealCount = Number(calculation[meal] || 0);
        const recipeNames = menuData?.items?.[meal] || [];

        for (const recipeName of recipeNames) {
          const recipeWasteKg = estimatedRecipeWaste[meal][recipeName] || 0;
          if (!recipeWasteKg || recipeWasteKg <= 0) continue;

          const recipe = await Recipe.findOne({ name: recipeName });
          if (!recipe) continue;

          let recipePlannedQtyKg = 0;
          const ingredientPlannedKg = [];

          recipe.ingredients.forEach((ing) => {
            const baseQty = ing.qtyPerPerson * mealCount;
            const plannedQty = baseQty + (baseQty * WASTAGE_PERCENT / 100);
            const plannedQtyInKg = convertQty(plannedQty, ing.unit);
            recipePlannedQtyKg += plannedQtyInKg;
            ingredientPlannedKg.push({ item: ing.item, qtyKg: plannedQtyInKg });
          });

          if (recipePlannedQtyKg <= 0) continue;

          const wasteRatio = recipeWasteKg / recipePlannedQtyKg;

          ingredientPlannedKg.forEach((ing) => {
            const ingredientWasteQty = ing.qtyKg * wasteRatio;
            derivedIngredientWaste[ing.item] = (derivedIngredientWaste[ing.item] || 0) + ingredientWasteQty;
          });
        }
      }

      Object.keys(derivedIngredientWaste).forEach((item) => {
        derivedIngredientWaste[item] = Number(derivedIngredientWaste[item].toFixed(4));
      });

      Object.keys(leftoverIngredientsMap).forEach((item) => {
        leftoverIngredientsMap[item] = Number(leftoverIngredientsMap[item].toFixed(4));
      });

      const updatedWaste = await Waste.findOneAndUpdate(
        { date },
        {
          date,
          inputType: 'v2-bin-leftover',
          waste: derivedIngredientWaste,
          leftoverIngredients: leftoverIngredientsMap,
          totalWasteBin: Number(totalWasteBin.toFixed(4)),
          recipeWaste: estimatedRecipeWaste,
          leftovers: normalizedLeftovers,
          createdAt: new Date()
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          overwrite: true
        }
      );

      return res.status(201).json({
        message: 'Waste and leftovers recorded (v2: proportional distribution)',
        data: updatedWaste
      });
    }

    return res.status(400).json({
      message: 'Only v2 input is supported. Submit totalWasteBin + leftovers with inputType="v2-bin-leftover".'
    });

    // LEGACY VALIDATION (only for v1 modes)
    if (!date || (!waste && !recipeWaste)) {
      return res.status(400).json({
        message: 'Date and either waste or recipeWaste data are required'
      });
    }

    // Backward compatible path: legacy ingredient-level payload (actual-usage)
    if (waste && !recipeWaste) {
      const normalizedWaste = toNumberMap(waste);
      const newWaste = new Waste({
        date,
        inputType: 'actual-usage',
        waste: normalizedWaste,
        recipeWaste: {
          breakfast: {},
          lunch: {},
          dinner: {}
        }
      });
      await newWaste.save();

      return res.status(201).json({
        message: 'Waste recorded',
        data: newWaste
      });
    }

    // Recipe-kg path (v1)
    const calculation = await Calculation.findOne({ date });
    if (!calculation) {
      return res.status(400).json({
        message: 'No calculation found for this date. Please run calculation first.'
      });
    }

    let menuData;
    try {
      const menuRes = await axios.get(`http://localhost:5002/api/menu/get/${date}`, {
        timeout: 5000
      });
      menuData = menuRes.data;
    } catch (menuError) {
      return res.status(500).json({
        message: 'Unable to fetch menu for waste conversion',
        error: menuError.message
      });
    }

    const normalizedRecipeWaste = {
      breakfast: toNumberMap(recipeWaste?.breakfast),
      lunch: toNumberMap(recipeWaste?.lunch),
      dinner: toNumberMap(recipeWaste?.dinner)
    };

    const derivedIngredientWaste = {};
    const meals = ['breakfast', 'lunch', 'dinner'];

    for (const meal of meals) {
      const mealCount = Number(calculation[meal] || 0);
      const recipeNames = menuData?.items?.[meal] || [];

      for (const recipeName of recipeNames) {
        const recipeWasteKg = Number(normalizedRecipeWaste[meal]?.[recipeName] || 0);
        if (!recipeWasteKg || recipeWasteKg <= 0) continue;

        const recipe = await Recipe.findOne({ name: recipeName });
        if (!recipe) {
          continue;
        }

        let recipePlannedQtyKg = 0;
        const ingredientPlannedKg = [];

        recipe.ingredients.forEach((ing) => {
          const baseQty = ing.qtyPerPerson * mealCount;
          const plannedQty = baseQty + (baseQty * WASTAGE_PERCENT / 100);
          const plannedQtyInKg = convertQty(plannedQty, ing.unit);
          recipePlannedQtyKg += plannedQtyInKg;
          ingredientPlannedKg.push({ item: ing.item, qtyKg: plannedQtyInKg });
        });

        if (recipePlannedQtyKg <= 0) {
          continue;
        }

        if (recipeWasteKg > recipePlannedQtyKg) {
          return res.status(400).json({
            message: `Invalid waste quantity for ${recipeName}. It cannot exceed planned recipe quantity (${recipePlannedQtyKg.toFixed(2)} kg).`
          });
        }

        const wasteRatio = recipeWasteKg / recipePlannedQtyKg;

        ingredientPlannedKg.forEach((ing) => {
          const ingredientWasteQty = ing.qtyKg * wasteRatio;

          derivedIngredientWaste[ing.item] =
            (derivedIngredientWaste[ing.item] || 0) + ingredientWasteQty;
        });
      }
    }

    Object.keys(derivedIngredientWaste).forEach((item) => {
      derivedIngredientWaste[item] = Number(derivedIngredientWaste[item].toFixed(4));
    });

    const newWaste = new Waste({
      date,
      inputType: 'recipe-kg',
      waste: derivedIngredientWaste,
      recipeWaste: normalizedRecipeWaste
    });
    await newWaste.save();

    res.status(201).json({
      message: 'Recipe waste recorded and ingredient waste derived',
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
