import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL;

if (!googleClientId || !googleClientSecret || !googleCallbackUrl) {
  throw new Error('Missing Google OAuth configuration in .env');
}

const client = new OAuth2Client(
  googleClientId,
  googleClientSecret,
  googleCallbackUrl
);

export const getGoogleAuthUrl = () => {
  // Login only needs identity (email/profile); the app uses domain-wide delegation
  // for Gmail/Directory, not the user's token. So no offline/consent prompt — let
  // Google skip the approval screen once the user has authorized once.
  return client.generateAuthUrl({
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });
};

export const getGoogleUser = async (code: string) => {
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new Error('Google did not return an ID token');
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: googleClientId,
  });

  return ticket.getPayload();
};
