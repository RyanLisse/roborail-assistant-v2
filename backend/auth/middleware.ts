import type { NextFunction, Request, Response } from "express";
import { AuthError, AuthProvider, type TokenPayload, type UserData } from "./auth-provider";

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const authProvider = new AuthProvider();

/**
 * Authentication middleware for Express routes
 * Validates JWT token and attaches user data to request
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: "Authorization header required" });
      return;
    }

    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Invalid authorization format" });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const tokenPayload = await authProvider.verifyToken(token);
      req.user = tokenPayload;
      next();
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(401).json({ error: error.message, code: error.code });
      } else {
        res.status(401).json({ error: "Authentication failed" });
      }
    }
  } catch (_error) {
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Decorator function to require authentication for route handlers
 */
export function requireAuth<T extends (req: Request, res: Response) => void>(handler: T): T {
  return ((req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    handler(req, res);
  }) as T;
}

/**
 * Utility function to extract user data from token
 */
export async function getUserFromToken(token: string): Promise<TokenPayload | null> {
  try {
    return await authProvider.verifyToken(token);
  } catch (_error) {
    return null;
  }
}

/**
 * Middleware to optionally authenticate requests
 * Attaches user data if valid token is provided, but doesn't reject unauthenticated requests
 */
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

    try {
      const tokenPayload = await authProvider.verifyToken(token);
      req.user = tokenPayload;
    } catch (_error) {
      // Don't fail for optional auth - just continue without user
    }
  }

  next();
}

/**
 * Check if the current user owns the resource by comparing user IDs
 */
export function checkResourceOwnership(req: Request, resourceUserId: string): boolean {
  return req.user?.userId === resourceUserId;
}

/**
 * Middleware to ensure user can only access their own resources
 */
export function enforceUserScope(userIdField = "userId") {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField];

    if (!resourceUserId) {
      res.status(400).json({ error: `${userIdField} parameter required` });
      return;
    }

    if (req.user.userId !== resourceUserId) {
      res.status(403).json({ error: "Access denied: insufficient permissions" });
      return;
    }

    next();
  };
}
