import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../services/authService';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'No authorization token provided' });
      return;
    }

    // Extract token (format: "Bearer <token>")
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    // Verify token
    const payload = verifyToken(token);

    // Attach user info to request
    req.user = payload;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is provided, but doesn't require it
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      const payload = verifyToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Continue without user info if token is invalid
    next();
  }
};
