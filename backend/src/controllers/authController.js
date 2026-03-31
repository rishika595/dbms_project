const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/authService");

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const result = await authService.login(email, password);
  res.json(result);
});

module.exports = {
  login
};
