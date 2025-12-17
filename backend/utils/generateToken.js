const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const JWT_SECRET = 'dvisionacademytoken'|| process.env.JWT_SECRET;

// Generate JWT Token
const generateToken = (id, role) => {
  // Force a 30-day default session window to avoid short accidental expirations.
  // If JWT_EXPIRE is set, use it (e.g., to extend beyond 30d).
  const expiresIn = (process.env.JWT_EXPIRE && process.env.JWT_EXPIRE.trim() !== '')
    ? process.env.JWT_EXPIRE
    : '30d';

  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn });
};

module.exports = generateToken;

