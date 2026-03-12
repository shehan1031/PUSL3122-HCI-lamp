import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'lamp-secret';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'designer' | 'admin';
  name: string;
}

// Extend Express Request with user
declare global {
  namespace Express {
    interface Request { user?: JWTPayload; }
  }
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).cookies?.lamp_token ?? null;
}

/** Attach req.user; 401 if missing/invalid */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized — no token provided' });
    return;
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Unauthorized — invalid token' });
  }
}

/** Requires valid JWT AND admin role */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Forbidden — admin only' });
      return;
    }
    next();
  });
}
