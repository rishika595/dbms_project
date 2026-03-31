const errorMiddleware = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    message: error.message || "Internal server error"
  });
};

module.exports = errorMiddleware;
