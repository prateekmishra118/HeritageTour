function requireAuth(req, res, next) {
  const userId = req.header('x-user-id');
  const userRole = req.header('x-user-role');

  if (!userId || !userRole) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Missing x-user-id or x-user-role header.'
    });
  }

  req.user = {
    user_id: parseInt(userId, 10),
    role: userRole
  };

  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    requireAuth(req, res, (err) => {
      if (err) return next(err);

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`
        });
      }

      next();
    });
  };
}

module.exports = {
  requireAuth,
  requireRole
};
