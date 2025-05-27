import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Zod schema for token payload validation
export const TokenPayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  iat: z.number(),
  exp: z.number(),
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

export interface UserData {
  userId: string;
  email: string;
}

export class AuthError extends Error {
  constructor(message: string, public code: string = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthError';
  }
}

export class AuthProvider {
  private readonly jwtSecret: string;
  private readonly tokenExpiry: string;

  constructor() {
    // In production, this should come from Encore secrets
    this.jwtSecret = process.env.JWT_SECRET || 'development-secret-key';
    this.tokenExpiry = '24h';
  }

  /**
   * Generate a JWT token for the given user data
   */
  async generateToken(userData: UserData): Promise<string> {
    try {
      const payload = {
        userId: userData.userId,
        email: userData.email,
      };

      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.tokenExpiry,
        issuer: 'roborail-assistant',
        audience: 'roborail-users',
      });

      return token;
    } catch (error) {
      throw new AuthError('Failed to generate token', 'TOKEN_GENERATION_ERROR');
    }
  }

  /**
   * Verify and decode a JWT token
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'roborail-assistant',
        audience: 'roborail-users',
      }) as jwt.JwtPayload;

      // Validate the decoded payload structure
      const validationResult = TokenPayloadSchema.safeParse(decoded);
      
      if (!validationResult.success) {
        throw new AuthError('Invalid token payload structure', 'INVALID_TOKEN_PAYLOAD');
      }

      return validationResult.data;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid token', 'INVALID_TOKEN');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('Token expired', 'TOKEN_EXPIRED');
      }
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Token verification failed', 'TOKEN_VERIFICATION_ERROR');
    }
  }

  /**
   * Refresh an existing token by generating a new one with the same user data
   */
  async refreshToken(existingToken: string): Promise<string> {
    try {
      // First verify the existing token (this will throw if invalid/expired)
      const decoded = await this.verifyToken(existingToken);
      
      // Generate a new token with the same user data
      const userData: UserData = {
        userId: decoded.userId,
        email: decoded.email,
      };

      return await this.generateToken(userData);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Failed to refresh token', 'TOKEN_REFRESH_ERROR');
    }
  }

  /**
   * Decode token without verification (useful for extracting user info when token might be expired)
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      
      if (!decoded) {
        return null;
      }

      const validationResult = TokenPayloadSchema.safeParse(decoded);
      return validationResult.success ? validationResult.data : null;
    } catch {
      return null;
    }
  }
}