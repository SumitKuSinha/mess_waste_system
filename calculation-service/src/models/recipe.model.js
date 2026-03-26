const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  ingredients: [
    {
      item: {
        type: String,
        required: true
      },
      qtyPerPerson: {
        type: Number,
        required: true
      },
      unit: {
        type: String,
        default: 'g'
      }
    }
  ],
  category: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Recipe', recipeSchema);
