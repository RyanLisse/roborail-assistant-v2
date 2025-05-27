/**
 * Authentication module for the RoboRail Assistant
 *
 * This module provides JWT-based authentication with:
 * - Token generation and verification
 * - Express middleware for route protection
 * - User-scoped access control
 * - Input validation with Zod schemas
 */

export {
  AuthProvider,
  AuthError,
  TokenPayloadSchema,
  type TokenPayload,
  type UserData,
} from "./auth-provider";

export {
  authMiddleware,
  optionalAuthMiddleware,
  requireAuth,
  getUserFromToken,
  checkResourceOwnership,
  enforceUserScope,
} from "./middleware";

// Re-export common types for convenience
export type { Request, Response, NextFunction } from "express";
