const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  meals: {
    breakfast: {
      type: String,
      enum: ["none", "half", "full"],
      default: "none",
    },
    lunch: {
      type: String,
      enum: ["none", "half", "full"],
      default: "none",
    },
    dinner: {
      type: String,
      enum: ["none", "half", "full"],
      default: "none",
    },
  },
}, { timestamps: true });

module.exports = mongoose.model("Response", responseSchema);