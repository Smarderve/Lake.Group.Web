import bcrypt from 'bcrypt';
import { config, DEFAULT_BCRYPT_COST } from '../config.js';

// bcrypt cost factor — 12 by default (above bcrypt's own default of 10).
// Read once; override via BCRYPT_COST in .env. Kept as a function so tests
// can set a low cost for speed via process.env.BCRYPT_COST.
function cost() {
  const fromEnv = Number(process.env.BCRYPT_COST);
  return Number.isInteger(fromEnv) && fromEnv >= 4 ? fromEnv : config.bcryptCost || DEFAULT_BCRYPT_COST;
}

export function hashPassword(password) {
  return bcrypt.hash(password, cost());
}

export function verifyPassword(password, passwordHash) {
  if (!passwordHash) return Promise.resolve(false);
  return bcrypt.compare(password, passwordHash);
}
