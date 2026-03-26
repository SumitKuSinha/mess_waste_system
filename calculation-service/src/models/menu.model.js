const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true
  },
  items: {
    breakfast: [String],
    lunch: [String],
    dinner: [String]
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

module.exports = mongoose.model('Menu', menuSchema);
