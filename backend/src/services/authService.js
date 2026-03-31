const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../config/db");

const login = async (email, password) => {
  const { rows } = await db.query(
    `
      SELECT
        u.user_id,
        u.username,
        u.email,
        u.password_hash,
        u.account_status,
        ri.display_name
      FROM "USER" u
      LEFT JOIN REGISTERED_INDIVIDUAL ri ON ri.user_id = u.user_id
      WHERE u.email = $1
      LIMIT 1
    `,
    [email]
  );

  const user = rows[0];

  if (!user) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  if (user.account_status !== "active") {
    const error = new Error("Account is not active");
    error.statusCode = 403;
    throw error;
  }

  const token = jwt.sign(
    {
      id: user.user_id,
      userId: user.user_id,
      email: user.email,
      username: user.username
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  return { token };
};

module.exports = {
  login
};
