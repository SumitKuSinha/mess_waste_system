const mongoose = require('mongoose');

const wasteSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  inputType: {
    type: String,
    enum: ['actual-usage', 'recipe-percent', 'recipe-kg', 'v2-bin-leftover'],
    default: 'actual-usage'
  },
  waste: {
    type: Map,
    of: Number
  },
  recipeWaste: {
    breakfast: {
      type: Map,
      of: Number,
      default: {}
    },
    lunch: {
      type: Map,
      of: Number,
      default: {}
    },
    dinner: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  leftovers: {
    breakfast: {
      type: Map,
      of: Number,
      default: {}
    },
    lunch: {
      type: Map,
      of: Number,
      default: {}
    },
    dinner: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  totalWasteBin: {
    type: Number,
    default: 0
  },
  leftoverIngredients: {
    type: Map,
    of: Number,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Waste', wasteSchema);
