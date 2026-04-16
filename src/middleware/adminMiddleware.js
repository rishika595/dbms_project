const jwt = require("jsonwebtoken");

const denyAdminAccess = (res) =>
  res.status(403).json({
    success: false,
    message: "Admin access required"
  });

const requireAdmin = (req, res, next) => {
  if (req.user?.role === "admin") {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return denyAdminAccess(res);
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      ...payload,
      id: payload.id || payload.userId,
      role: payload.role || "registered_user"
    };
  } catch (_error) {
    return denyAdminAccess(res);
  }

  if (req.user.role !== "admin") {
    return denyAdminAccess(res);
  }

  next();
};

module.exports = {
  requireAdmin
};
