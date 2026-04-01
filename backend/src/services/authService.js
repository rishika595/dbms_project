const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../config/db");

const signAuthToken = (user) =>
  jwt.sign(
    {
      id: user.user_id,
      userId: user.user_id,
      email: user.email,
      username: user.username
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

const login = async (email, password) => {
  if (!email || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

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
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (user.account_status !== "active") {
    const error = new Error("Account is not active");
    error.statusCode = 403;
    throw error;
  }

  const token = signAuthToken(user);

  return { token };
};

const register = async ({ username, email, password, displayName }) => {
  if (!username || !email || !password || !displayName) {
    const error = new Error("username, email, password, and displayName are required");
    error.statusCode = 400;
    throw error;
  }

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const existingUsername = await client.query(
      'SELECT 1 FROM "USER" WHERE username = $1 LIMIT 1',
      [username]
    );

    if (existingUsername.rowCount) {
      const error = new Error("Username already exists");
      error.statusCode = 409;
      throw error;
    }

    const existingEmail = await client.query(
      'SELECT 1 FROM "USER" WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existingEmail.rowCount) {
      const error = new Error("Email already exists");
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `
        INSERT INTO "USER" (
          username,
          email,
          password_hash
        )
        VALUES ($1, $2, $3)
        RETURNING user_id, username, email
      `,
      [username, email, passwordHash]
    );

    const user = userResult.rows[0];

    await client.query(
      `
        INSERT INTO REGISTERED_INDIVIDUAL (
          user_id,
          display_name
        )
        VALUES ($1, $2)
      `,
      [user.user_id, displayName]
    );

    await client.query("COMMIT");

    return {
      success: true,
      message: "User registered successfully",
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        displayName
      },
      token: signAuthToken(user)
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  login,
  register
};
