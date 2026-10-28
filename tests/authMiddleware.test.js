import { describe, it, expect, vi } from 'vitest';
import { requireAuth } from '../src/middleware/authMiddleware.js';

describe('Authentication Middleware', () => {
  it('should return 401 if Authorization header is missing', async () => {
    const req = { headers: {} };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: expect.stringContaining('Authorization token required'),
        }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if Authorization header is not Bearer', async () => {
    const req = { headers: { authorization: 'Basic 12345' } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should accept mock test token in test environment and populate req.user', async () => {
    const req = { headers: { authorization: 'Bearer test-mock-token-user-abc' } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('user-abc');
    expect(req.user.email).toBe('user-abc@test.local');
    expect(req.supabase).toBeDefined();
    expect(next).toHaveBeenCalled();
  });
});

