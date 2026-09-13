const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { recordAudit } = require('../middleware/audit');

const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

function toPublicUser(user) {
  return { id: user.id, fullName: user.full_name, email: user.email, role: user.role };
}

const register = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.query(
    'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
    [fullName, email, passwordHash]
  );

  const user = { id: result.insertId, email, role: 'user' };
  const token = signToken(user);

  await recordAudit({ userId: user.id, action: 'REGISTER', entityType: 'auth', entityId: user.id });

  res.status(201).json({
    token,
    user: toPublicUser({ id: user.id, full_name: fullName, email, role: 'user' })
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await pool.query(
    'SELECT id, full_name, email, password_hash, role FROM users WHERE email = ?',
    [email]
  );
  const user = rows[0];

  // Same error for both cases so we don't leak which part was wrong.
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken(user);
  await recordAudit({ userId: user.id, action: 'LOGIN', entityType: 'auth', entityId: user.id });

  res.json({ token, user: toPublicUser(user) });
});

// JWTs are stateless, so logout is really a client-side token discard.
// The endpoint still exists and is audited.
const logout = asyncHandler(async (req, res) => {
  await recordAudit({ userId: req.user?.id, action: 'LOGOUT', entityType: 'auth', entityId: req.user?.id });
  res.json({ message: 'Logged out successfully' });
});

const me = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, full_name, email, role FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!rows[0]) throw new ApiError(404, 'User not found');
  res.json(toPublicUser(rows[0]));
});

module.exports = { register, login, logout, me };
