import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const generateToken = (userId: string, email: string, role: string): string => {
  return jwt.sign(
    { sub: userId, email, role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const payload = decoded as any;
  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };

  next();
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  authMiddleware(req, res, (): void => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
};

export const optionalAuthMiddleware = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);

    if (decoded) {
      const payload = decoded as any;
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    }
  }

  next();
};
