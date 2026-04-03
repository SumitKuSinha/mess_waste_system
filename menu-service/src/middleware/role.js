const roleMiddleware = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      console.log(`[ERR] Role check failed: User role "${req.user.role}" != Required "${role}"`);
      return res.status(403).json({ 
        message: "Access denied",
        userRole: req.user.role,
        requiredRole: role
      });
    }
    console.log(`[OK] Role check passed: ${req.user.role}`);
    next();
  };
};

module.exports = roleMiddleware;
