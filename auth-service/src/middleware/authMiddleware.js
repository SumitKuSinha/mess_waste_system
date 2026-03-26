const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token" });
    }

    // 🔥 extract token properly
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("✅ Token verified:", decoded);

    req.user = decoded;
    next();
  } catch (error) {
    console.error("❌ Token error:", error.message);
    return res.status(401).json({ message: "Invalid token", error: error.message });
  }
};

module.exports = authMiddleware;
