const mongoose = require("mongoose");

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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Menu", menuSchema);
