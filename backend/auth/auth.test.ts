import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { AuthProvider, AuthError, TokenPayload } from './auth-provider';

describe('Authentication Provider', () => {
  let authProvider: AuthProvider;

  beforeEach(() => {
    authProvider = new AuthProvider();
    vi.clearAllMocks();
  });

  describe('Token Generation', () => {
    it('should generate valid JWT token for user', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      
      const token = await authProvider.generateToken({ userId, email });
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should include user data in token payload', async () => {
      const userData = { userId: 'user-123', email: 'test@example.com' };
      
      const token = await authProvider.generateToken(userData);
      const decoded = await authProvider.verifyToken(token);
      
      expect(decoded.userId).toBe(userData.userId);
      expect(decoded.email).toBe(userData.email);
    });

    it('should set token expiration', async () => {
      const userData = { userId: 'user-123', email: 'test@example.com' };
      
      const token = await authProvider.generateToken(userData);
      const decoded = await authProvider.verifyToken(token);
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe('Token Verification', () => {
    it('should verify valid token', async () => {
      const userData = { userId: 'user-123', email: 'test@example.com' };
      const token = await authProvider.generateToken(userData);
      
      const decoded = await authProvider.verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(userData.userId);
    });

    it('should reject invalid token', async () => {
      const invalidToken = 'invalid.token.here';
      
      await expect(authProvider.verifyToken(invalidToken)).rejects.toThrow(AuthError);
    });

    it('should reject expired token', async () => {
      const expiredToken = 'expired.jwt.token';
      
      await expect(authProvider.verifyToken(expiredToken)).rejects.toThrow(AuthError);
    });

    it('should reject malformed token', async () => {
      const malformedToken = 'not-a-jwt';
      
      await expect(authProvider.verifyToken(malformedToken)).rejects.toThrow(AuthError);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh valid token', async () => {
      const userData = { userId: 'user-123', email: 'test@example.com' };
      const originalToken = await authProvider.generateToken(userData);
      
      const newToken = await authProvider.refreshToken(originalToken);
      
      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(originalToken);
      
      const decoded = await authProvider.verifyToken(newToken);
      expect(decoded.userId).toBe(userData.userId);
    });

    it('should reject refresh of invalid token', async () => {
      const invalidToken = 'invalid.token.here';
      
      await expect(authProvider.refreshToken(invalidToken)).rejects.toThrow(AuthError);
    });
  });
});

describe('Authentication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: vi.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFn = vi.fn();
  });

  describe('authMiddleware', () => {
    it('should pass valid token through middleware', async () => {
      const authProvider = new AuthProvider();
      const userData = { userId: 'user-123', email: 'test@example.com' };
      const token = await authProvider.generateToken(userData);
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      await authMiddleware(mockReq as Request, mockRes as Response, nextFn);
      
      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.userId).toBe(userData.userId);
    });

    it('should reject request without authorization header', async () => {
      mockReq.headers = {};
      
      await authMiddleware(mockReq as Request, mockRes as Response, nextFn);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authorization header required' });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', async () => {
      mockReq.headers = { authorization: 'InvalidFormat token' };
      
      await authMiddleware(mockReq as Request, mockRes as Response, nextFn);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid authorization format' });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      mockReq.headers = { authorization: 'Bearer invalid.token.here' };
      
      await authMiddleware(mockReq as Request, mockRes as Response, nextFn);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(nextFn).not.toHaveBeenCalled();
    });
  });

  describe('requireAuth decorator', () => {
    it('should allow access to authenticated users', () => {
      mockReq.user = { userId: 'user-123', email: 'test@example.com' };
      
      const decoratedHandler = requireAuth((req, res) => {
        res.json({ success: true });
      });
      
      decoratedHandler(mockReq as Request, mockRes as Response);
      
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });

    it('should reject unauthenticated requests', () => {
      mockReq.user = undefined;
      
      const decoratedHandler = requireAuth((req, res) => {
        res.json({ success: true });
      });
      
      decoratedHandler(mockReq as Request, mockRes as Response);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });
  });

  describe('getUserFromToken utility', () => {
    it('should extract user data from valid token', async () => {
      const authProvider = new AuthProvider();
      const userData = { userId: 'user-123', email: 'test@example.com' };
      const token = await authProvider.generateToken(userData);
      
      const extractedUser = await getUserFromToken(token);
      
      expect(extractedUser).toBeDefined();
      expect(extractedUser.userId).toBe(userData.userId);
      expect(extractedUser.email).toBe(userData.email);
    });

    it('should return null for invalid token', async () => {
      const invalidToken = 'invalid.token.here';
      
      const extractedUser = await getUserFromToken(invalidToken);
      
      expect(extractedUser).toBeNull();
    });
  });
});

describe('Token Payload Validation', () => {
  it('should validate correct token payload structure', () => {
    const validPayload = {
      userId: 'user-123',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const TokenPayloadSchema = z.object({
      userId: z.string(),
      email: z.string().email(),
      iat: z.number(),
      exp: z.number(),
    });

    const result = TokenPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should reject invalid token payload structure', () => {
    const invalidPayload = {
      userId: 123, // should be string
      email: 'invalid-email', // should be valid email
      iat: 'not-a-number', // should be number
    };

    const TokenPayloadSchema = z.object({
      userId: z.string(),
      email: z.string().email(),
      iat: z.number(),
      exp: z.number(),
    });

    const result = TokenPayloadSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
});