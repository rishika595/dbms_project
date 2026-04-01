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

const register = asyncHandler(async (req, res) => {
  const { username, email, password, displayName } = req.body;

  if (!username || !email || !password || !displayName) {
    return res.status(400).json({
      message: "username, email, password, and displayName are required"
    });
  }

  const result = await authService.register({
    username,
    email,
    password,
    displayName
  });

  res.status(201).json(result);
});

module.exports = {
  login,
  register
};
