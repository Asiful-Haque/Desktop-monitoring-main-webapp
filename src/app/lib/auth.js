import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'your-secret';

export function signToken(payload) {
  console.log("Signing token with payload:", payload);
  return jwt.sign(payload, SECRET, { expiresIn: '1m' });
}

export function verifyToken(token) {
  console.log("Verifying token---------------------:", token);
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return null;
  }
}