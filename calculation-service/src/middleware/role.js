const roleMiddleware = (...requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // If no roles specified, allow all authenticated users
    if (requiredRoles.length === 0) {
      return next();
    }

    // Check if user role is in the required roles array
    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied: Required role(s): ${requiredRoles.join(', ')}` });
    }

    next();
  };
};

module.exports = roleMiddleware;
