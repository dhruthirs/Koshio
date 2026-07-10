const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { createWallet } = require('./walletService');

const TOKEN_EXPIRY = '30d';

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

function generateToken(userId) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set in .env');
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET); // throws if invalid/expired
}

/** Creates a new user with a hashed password, plus their first wallet. */
async function signup(name, email, password) {
  const existing = await pool.query('select id from users where email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new AuthError('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `insert into users (name, email, password_hash) values ($1, $2, $3) returning id`,
    [name, email, passwordHash]
  );
  const userId = rows[0].id;
  const wallet = await createWallet(userId);

  return { token: generateToken(userId), userId, walletId: wallet.id };
}

async function login(email, password) {
  const { rows } = await pool.query('select * from users where email = $1', [email]);
  if (rows.length === 0) throw new AuthError('Invalid email or password.');

  const user = rows[0];
  const matches = await bcrypt.compare(password, user.password_hash || '');
  if (!matches) throw new AuthError('Invalid email or password.');

  const walletRes = await pool.query('select id from wallets where user_id = $1 limit 1', [user.id]);
  const walletId = walletRes.rows[0]?.id || null;

  return { token: generateToken(user.id), userId: user.id, walletId };
}

module.exports = { signup, login, generateToken, verifyToken, AuthError };
