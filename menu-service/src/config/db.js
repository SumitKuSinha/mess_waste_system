const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("[OK] MongoDB connected (menu-service)");
  } catch (error) {
    console.error("[ERR] DB error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
