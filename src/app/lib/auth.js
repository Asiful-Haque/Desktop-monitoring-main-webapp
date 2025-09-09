// lib/auth.js (replace signToken and verifyToken)

import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret');

export async function signToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

export async function verifyToken(token) {
  // console.log("Verifying token in the verifyToken ^^^^^^^^^^^^^^^^ function:", token);
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return null;
  }
}
