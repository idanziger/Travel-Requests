import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET in environment');
}

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'travel_requests_session';
const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 8);
const isSecureCookie =
  process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';

type SessionRole = 'employee' | 'admin';

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: SessionRole;
}

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
}

const encodeBase64Url = (value: Buffer | string) =>
  Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padding), 'base64').toString('utf8');
};

export const signSessionToken = (user: SessionUser) => {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    })
  );
  const content = `${header}.${payload}`;
  const signature = encodeBase64Url(
    crypto.createHmac('sha256', JWT_SECRET).update(content).digest()
  );

  return `${content}.${signature}`;
};

export const verifySessionToken = (token: string): SessionUser | null => {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) {
    return null;
  }

  const expectedSignature = encodeBase64Url(
    crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest()
  );

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  const parsedPayload = JSON.parse(decodeBase64Url(payload)) as {
    sub: string;
    email: string;
    name: string;
    role: SessionRole;
    exp: number;
  };

  if (!parsedPayload.exp || parsedPayload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return {
    id: Number(parsedPayload.sub),
    email: parsedPayload.email,
    name: parsedPayload.name,
    role: parsedPayload.role,
  };
};

const parseCookies = (cookieHeader?: string) => {
  return Object.fromEntries(
    (cookieHeader || '')
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separatorIndex = entry.indexOf('=');
        if (separatorIndex === -1) {
          return [entry, ''];
        }

        return [
          decodeURIComponent(entry.slice(0, separatorIndex)),
          decodeURIComponent(entry.slice(separatorIndex + 1)),
        ];
      })
  );
};

export const setSessionCookie = (res: Response, token: string) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: '/',
  });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: 'lax',
    path: '/',
  });
};

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = verifySessionToken(token);
  if (!user) {
    clearSessionCookie(res);
    return res.status(401).json({ error: 'Invalid session' });
  }

  req.user = user;
  next();
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};
