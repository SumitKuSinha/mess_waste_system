const mongoose = require('mongoose');

const calculationSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true
  },
  breakfast: {
    type: Number,
    default: 0
  },
  lunch: {
    type: Number,
    default: 0
  },
  dinner: {
    type: Number,
    default: 0
  },
  totalResponses: {
    type: Number,
    default: 0
  },
  ingredients: {
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Calculation', calculationSchema);
