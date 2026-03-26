const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  studentId: String,
  date: String,
  meals: {
    breakfast: {
      type: String,
      enum: ['none', 'half', 'full'],
      default: 'none'
    },
    lunch: {
      type: String,
      enum: ['none', 'half', 'full'],
      default: 'none'
    },
    dinner: {
      type: String,
      enum: ['none', 'half', 'full'],
      default: 'none'
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

module.exports = mongoose.model('Response', responseSchema);
