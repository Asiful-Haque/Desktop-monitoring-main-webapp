
// app/lib/auth.js
import { SignJWT, jwtVerify } from 'jose';

const accessSecret  = new TextEncoder().encode(process.env.ACCESS_SECRET  || 'access123');
const refreshSecret = new TextEncoder().encode(process.env.REFRESH_SECRET || 'refresh123');

export async function signToken(payload) {
  // console.log("Token signed ************:", payload);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(accessSecret);
}

export async function verifyToken(token) {
  // console.log("Verifying token in the verifyToken ^^^^^^^^^^^^^^^^ function:", token);
  try { return (await jwtVerify(token, accessSecret)).payload; }
  catch { return null; }
}

export async function signRefreshToken(payload) {
  // console.log("Refresh Token signed ************:", payload);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(refreshSecret);
}

export async function verifyRefreshToken(token) {
  // console.log("Verifying refresh token in the verifyRefreshToken ^^^^^^^^^^^^^^^^ function:", token);
  try { return (await jwtVerify(token, refreshSecret)).payload; }
  catch { return null; }
}
