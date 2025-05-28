import { beforeEach, describe, expect, test, vi } from "vitest";
import { closeRedisConnection, getRedisClient, testRedisConnection } from "../redis.client";

// Mock ioredis
vi.mock("ioredis", () => {
  const mockRedis = {
    ping: vi.fn().mockResolvedValue("PONG"),
    quit: vi.fn().mockResolvedValue("OK"),
    disconnect: vi.fn(),
    on: vi.fn(),
  };

  return {
    Redis: vi.fn(() => mockRedis),
  };
});

// Mock Encore config
vi.mock("encore.dev/config", () => ({
  secret: vi.fn(() => () => "redis://localhost:6379"),
}));

describe("Redis Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should create Redis client with correct configuration", () => {
    const client = getRedisClient();
    expect(client).toBeDefined();
  });

  test("should test Redis connection successfully", async () => {
    const isConnected = await testRedisConnection();
    expect(isConnected).toBe(true);
  });

  test("should handle connection test failure", async () => {
    // Mock ping to throw error
    const { Redis } = await import("ioredis");
    const mockInstance = new Redis();
    vi.mocked(mockInstance.ping).mockRejectedValueOnce(new Error("Connection failed"));

    const isConnected = await testRedisConnection();
    expect(isConnected).toBe(false);
  });

  test("should close Redis connection gracefully", async () => {
    const client = getRedisClient();
    await closeRedisConnection();

    const { Redis } = await import("ioredis");
    const mockInstance = new Redis();
    expect(mockInstance.quit).toHaveBeenCalled();
  });

  test("should throw error when Redis URL is not configured", () => {
    // Mock secret to return undefined
    vi.doMock("encore.dev/config", () => ({
      secret: vi.fn(() => () => undefined),
    }));

    expect(() => getRedisClient()).toThrow("Redis not configured");
  });
});
