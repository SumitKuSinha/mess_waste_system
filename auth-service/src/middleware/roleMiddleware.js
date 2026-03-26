const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role;

    console.log(`🔍 Role check: User role = "${userRole}", Allowed = ${allowedRoles}`);

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: "Access denied",
        userRole,
        requiredRoles: allowedRoles
      });
    }

    console.log(`✅ Role check passed for ${userRole}`);
    next();
  };
};

module.exports = roleMiddleware;
