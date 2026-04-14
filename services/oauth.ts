declare const require: any;
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || '';
const APPLE_KEY_ID = process.env.APPLE_KEY_ID || '';
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || '';
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY || ''; // PEM string

export async function verifyGoogleIdToken(idToken: string) {
  let OAuth2Client: any
  try {
    OAuth2Client = require('google-auth-library').OAuth2Client
  } catch (err) {
    throw new Error('google-auth-library não está instalado. Rode `npm install google-auth-library` quando estiver em rede disponível.');
  }

  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  return payload; // contains email, sub, name, picture, etc.
}

// Generate Apple client_secret (JWT) for server-to-server token exchange
export async function generateAppleClientSecret() {
  if (!APPLE_PRIVATE_KEY) throw new Error('APPLE_PRIVATE_KEY not configured');

  const alg = 'ES256';
  const privateKey = APPLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  let jose: any
  try {
    jose = require('jose')
  } catch (err) {
    throw new Error('lib "jose" não está instalada. Rode `npm install jose` quando estiver em rede disponível.');
  }

  const jwt = await jose.SignJWT({
    iss: APPLE_TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 180, // valid up to 180 days (Apple allows up to 6 months)
    aud: 'https://appleid.apple.com',
    sub: APPLE_CLIENT_ID,
  })
    .setProtectedHeader({ alg, kid: APPLE_KEY_ID })
    .sign(await jose.importPKCS8(privateKey, alg));

  return jwt;
}

export async function exchangeAppleCode(code: string) {
  const clientSecret = await generateAppleClientSecret();
  const tokenUrl = 'https://appleid.apple.com/auth/token';
  const params = new URLSearchParams();
  params.append('client_id', APPLE_CLIENT_ID);
  params.append('client_secret', clientSecret);
  params.append('code', code);
  params.append('grant_type', 'authorization_code');

  const res = await axios.post(tokenUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return res.data; // contains id_token, access_token, refresh_token
}
