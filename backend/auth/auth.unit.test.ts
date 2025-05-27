import { beforeEach, describe, expect, it } from "bun:test";
import { AuthError, AuthProvider, TokenPayloadSchema } from "./auth-provider";

describe("Authentication Provider", () => {
  let authProvider: AuthProvider;

  beforeEach(() => {
    authProvider = new AuthProvider();
  });

  describe("Token Generation and Verification", () => {
    it("should generate and verify valid JWT token for user", async () => {
      const userId = "user-123";
      const email = "test@example.com";

      const token = await authProvider.generateToken({ userId, email });

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);

      const decoded = await authProvider.verifyToken(token);
      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
    });

    it("should include proper token structure", async () => {
      const userData = { userId: "user-123", email: "test@example.com" };

      const token = await authProvider.generateToken(userData);
      const decoded = await authProvider.verifyToken(token);

      expect(decoded.userId).toBe(userData.userId);
      expect(decoded.email).toBe(userData.email);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it("should reject malformed token", async () => {
      const malformedToken = "not-a-jwt";

      await expect(authProvider.verifyToken(malformedToken)).rejects.toThrow(AuthError);
    });

    it("should reject token with invalid signature", async () => {
      const invalidToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.invalid_signature";

      await expect(authProvider.verifyToken(invalidToken)).rejects.toThrow(AuthError);
    });
  });

  describe("Token Refresh", () => {
    it("should refresh valid token with new expiration", async () => {
      const userData = { userId: "user-123", email: "test@example.com" };
      const originalToken = await authProvider.generateToken(userData);

      // Wait a moment to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const newToken = await authProvider.refreshToken(originalToken);

      expect(newToken).toBeDefined();

      const originalDecoded = await authProvider.verifyToken(originalToken);
      const newDecoded = await authProvider.verifyToken(newToken);

      expect(newDecoded.userId).toBe(originalDecoded.userId);
      expect(newDecoded.email).toBe(originalDecoded.email);
      expect(newDecoded.iat).toBeGreaterThanOrEqual(originalDecoded.iat);
    });

    it("should reject refresh of invalid token", async () => {
      const invalidToken = "invalid.token.here";

      await expect(authProvider.refreshToken(invalidToken)).rejects.toThrow(AuthError);
    });
  });

  describe("Token Decoding", () => {
    it("should decode valid token without verification", () => {
      const userData = { userId: "user-123", email: "test@example.com" };

      // Generate a token first, then decode it
      authProvider.generateToken(userData).then((token) => {
        const decoded = authProvider.decodeToken(token);

        expect(decoded).toBeDefined();
        expect(decoded?.userId).toBe(userData.userId);
        expect(decoded?.email).toBe(userData.email);
      });
    });

    it("should return null for invalid token", () => {
      const invalidToken = "invalid.token.here";

      const decoded = authProvider.decodeToken(invalidToken);

      expect(decoded).toBeNull();
    });
  });

  describe("Error Handling", () => {
    it("should throw AuthError for invalid operations", async () => {
      const invalidToken = "invalid.token.format";

      try {
        await authProvider.verifyToken(invalidToken);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBeDefined();
        expect((error as AuthError).message).toBeDefined();
      }
    });
  });
});

describe("Token Payload Validation", () => {
  it("should validate correct token payload structure", () => {
    const validPayload = {
      userId: "user-123",
      email: "test@example.com",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const result = TokenPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.userId).toBe(validPayload.userId);
      expect(result.data.email).toBe(validPayload.email);
    }
  });

  it("should reject invalid token payload structure", () => {
    const invalidPayload = {
      userId: 123, // should be string
      email: "invalid-email", // should be valid email
      iat: "not-a-number", // should be number
    };

    const result = TokenPayloadSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("should require all required fields", () => {
    const incompletePayload = {
      userId: "user-123",
      // missing email, iat, exp
    };

    const result = TokenPayloadSchema.safeParse(incompletePayload);
    expect(result.success).toBe(false);
  });

  it("should validate email format", () => {
    const invalidEmailPayload = {
      userId: "user-123",
      email: "not-an-email",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const result = TokenPayloadSchema.safeParse(invalidEmailPayload);
    expect(result.success).toBe(false);
  });
});
