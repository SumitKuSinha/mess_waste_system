const mongoose = require("mongoose");

const notificationReadSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    notificationKey: {
      type: String,
      required: true,
      index: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

notificationReadSchema.index({ userId: 1, notificationKey: 1 }, { unique: true });

module.exports = mongoose.model("NotificationRead", notificationReadSchema);
