const mongoose = require('mongoose');

const wasteSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  waste: {
    type: Map,
    of: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Waste', wasteSchema);
