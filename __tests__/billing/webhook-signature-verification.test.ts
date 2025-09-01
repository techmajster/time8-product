/**
 * Webhook Signature Verification Tests for Lemon Squeezy Integration
 * 
 * These tests verify HMAC-SHA256 signature validation for webhook security.
 * Critical for preventing unauthorized webhook processing and ensuring data integrity.
 * 
 * @jest-environment node
 */

import crypto from 'crypto';

// Mock crypto functions for testing
const mockHmac = {
  update: jest.fn().mockReturnThis(),
  digest: jest.fn()
};

jest.mock('crypto', () => ({
  createHmac: jest.fn(() => mockHmac),
  timingSafeEqual: jest.fn()
}));

// Test webhook payload
const mockWebhookPayload = {
  meta: {
    event_name: 'subscription_created',
    event_id: 'test-event-123'
  },
  data: {
    id: '12345',
    type: 'subscriptions',
    attributes: {
      status: 'active',
      quantity: 1,
      renews_at: '2024-12-01T00:00:00Z'
    }
  }
};

describe('Webhook Signature Verification', () => {
  const testSecret = 'test-webhook-secret-key';
  const testPayload = JSON.stringify(mockWebhookPayload);
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = testSecret;
  });

  afterEach(() => {
    delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid HMAC-SHA256 signature', async () => {
      // Use a specific signature for consistent testing
      const expectedSignature = 'valid-signature-hex';

      // Mock crypto functions to return expected values
      (crypto.createHmac as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(expectedSignature)
      });

      (crypto.timingSafeEqual as jest.Mock).mockReturnValue(true);

      const { verifyWebhookSignature } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      const result = verifyWebhookSignature(testPayload, expectedSignature, testSecret);
      
      expect(result).toBe(true);
      expect(crypto.createHmac).toHaveBeenCalledWith('sha256', testSecret);
      expect(crypto.timingSafeEqual).toHaveBeenCalled();
    });

    it('should reject invalid signature', async () => {
      const validSignature = 'valid-signature-hex';
      const invalidSignature = 'invalid-signature-hex';

      (crypto.createHmac as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(validSignature)
      });

      (crypto.timingSafeEqual as jest.Mock).mockReturnValue(false);

      const { verifyWebhookSignature } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      const result = verifyWebhookSignature(testPayload, invalidSignature, testSecret);
      
      expect(result).toBe(false);
      expect(crypto.timingSafeEqual).toHaveBeenCalledWith(
        Buffer.from(validSignature, 'hex'),
        Buffer.from(invalidSignature, 'hex')
      );
    });

    it('should handle empty signature', async () => {
      const { verifyWebhookSignature } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      const result = verifyWebhookSignature(testPayload, '', testSecret);
      
      expect(result).toBe(false);
    });

    it('should handle empty secret', async () => {
      const signature = 'test-signature';
      
      const { verifyWebhookSignature } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      const result = verifyWebhookSignature(testPayload, signature, '');
      
      expect(result).toBe(false);
    });

    it('should handle malformed signature', async () => {
      const malformedSignature = 'not-a-hex-string!!!';

      (crypto.createHmac as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('valid-hex-string')
      });

      // Mock Buffer.from to throw an error for invalid hex
      const originalBufferFrom = Buffer.from;
      Buffer.from = jest.fn((str: string, encoding: string) => {
        if (str === malformedSignature && encoding === 'hex') {
          throw new Error('Invalid hex string');
        }
        return originalBufferFrom(str, encoding as BufferEncoding);
      });

      const { verifyWebhookSignature } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      expect(() => {
        verifyWebhookSignature(testPayload, malformedSignature, testSecret);
      }).toThrow();

      // Restore Buffer.from
      Buffer.from = originalBufferFrom;
    });

    it('should use timing-safe comparison to prevent timing attacks', async () => {
      const signature = 'test-signature';

      (crypto.createHmac as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('computed-signature')
      });

      (crypto.timingSafeEqual as jest.Mock).mockReturnValue(true);

      const { verifyWebhookSignature } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      verifyWebhookSignature(testPayload, signature, testSecret);
      
      expect(crypto.timingSafeEqual).toHaveBeenCalledWith(
        Buffer.from('computed-signature', 'hex'),
        Buffer.from(signature, 'hex')
      );
    });
  });

  describe('extractSignatureFromHeader', () => {
    it('should extract signature from X-Signature header', async () => {
      const signature = 'sha256=abc123def456';
      
      // Mock NextRequest without importing it directly
      const mockRequest = {
        headers: {
          get: jest.fn((key: string) => {
            if (key === 'X-Signature' || key === 'x-signature') {
              return signature;
            }
            if (key === 'Content-Type') {
              return 'application/json';
            }
            return null;
          })
        }
      };

      const { extractSignatureFromHeader } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      const result = extractSignatureFromHeader(mockRequest as any);
      
      expect(result).toBe('abc123def456');
    });

    it('should handle missing X-Signature header', async () => {
      const mockRequest = {
        headers: {
          get: jest.fn((key: string) => {
            if (key === 'Content-Type') return 'application/json';
            return null;
          })
        }
      };

      const { extractSignatureFromHeader } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      const result = extractSignatureFromHeader(mockRequest as any);
      
      expect(result).toBeNull();
    });

    it('should handle malformed signature header', async () => {
      const malformedSignature = 'not-sha256-format';
      const mockRequest = {
        headers: {
          get: jest.fn((key: string) => {
            if (key === 'X-Signature' || key === 'x-signature') return malformedSignature;
            if (key === 'Content-Type') return 'application/json';
            return null;
          })
        }
      };

      const { extractSignatureFromHeader } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      const result = extractSignatureFromHeader(mockRequest as any);
      
      expect(result).toBeNull();
    });

    it('should handle case-insensitive header names', async () => {
      const signature = 'sha256=abc123def456';
      const mockRequest = {
        headers: {
          get: jest.fn((key: string) => {
            if (key === 'x-signature') return signature; // lowercase
            if (key === 'Content-Type') return 'application/json';
            return null;
          })
        }
      };

      const { extractSignatureFromHeader } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      const result = extractSignatureFromHeader(mockRequest as any);
      
      expect(result).toBe('abc123def456');
    });
  });

  describe('validateWebhookRequest', () => {
    it('should validate complete webhook request', async () => {
      const signature = 'abc123def456';
      const mockRequest = {
        headers: {
          get: jest.fn((key: string) => {
            if (key === 'X-Signature' || key === 'x-signature') return `sha256=${signature}`;
            if (key === 'Content-Type') return 'application/json';
            return null;
          })
        },
        text: jest.fn().mockResolvedValue(testPayload)
      };

      (crypto.createHmac as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(signature)
      });

      (crypto.timingSafeEqual as jest.Mock).mockReturnValue(true);

      const { validateWebhookRequest } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      const result = await validateWebhookRequest(mockRequest as any);
      
      expect(result.isValid).toBe(true);
      expect(result.payload).toEqual(mockWebhookPayload);
    });

    it('should reject request with invalid signature', async () => {
      const mockRequest = {
        headers: {
          get: jest.fn((key: string) => {
            if (key === 'X-Signature' || key === 'x-signature') return 'sha256=invalid-signature';
            if (key === 'Content-Type') return 'application/json';
            return null;
          })
        },
        text: jest.fn().mockResolvedValue(testPayload)
      };

      (crypto.createHmac as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('valid-signature')
      });

      (crypto.timingSafeEqual as jest.Mock).mockReturnValue(false);

      const { validateWebhookRequest } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      const result = await validateWebhookRequest(mockRequest as any);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid webhook signature');
    });

    it('should reject request with missing signature', async () => {
      const mockRequest = {
        headers: {
          get: jest.fn((key: string) => {
            if (key === 'Content-Type') return 'application/json';
            return null;
          })
        },
        text: jest.fn().mockResolvedValue(testPayload)
      };

      const { validateWebhookRequest } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      const result = await validateWebhookRequest(mockRequest as any);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing webhook signature');
    });

    it('should handle invalid JSON payload', async () => {
      const invalidJson = '{"invalid": json}';
      const mockRequest = {
        headers: {
          get: jest.fn((key: string) => {
            if (key === 'X-Signature' || key === 'x-signature') return 'sha256=signature';
            if (key === 'Content-Type') return 'application/json';
            return null;
          })
        },
        text: jest.fn().mockResolvedValue(invalidJson)
      };

      // Mock signature validation to pass, so we can test JSON parsing
      (crypto.createHmac as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('signature')
      });

      (crypto.timingSafeEqual as jest.Mock).mockReturnValue(true);

      const { validateWebhookRequest } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      const result = await validateWebhookRequest(mockRequest as any);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid JSON payload');
    });
  });

  describe('Security Tests', () => {
    it('should prevent replay attacks with timestamp validation', async () => {
      const oldTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      const payloadWithTimestamp = {
        ...mockWebhookPayload,
        meta: {
          ...mockWebhookPayload.meta,
          timestamp: oldTimestamp
        }
      };

      const { validateWebhookTimestamp } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      const result = validateWebhookTimestamp(payloadWithTimestamp, 300); // 5 minute tolerance
      
      expect(result).toBe(false);
    });

    it('should accept recent webhooks', async () => {
      const recentTimestamp = Date.now() - (2 * 60 * 1000); // 2 minutes ago
      const payloadWithTimestamp = {
        ...mockWebhookPayload,
        meta: {
          ...mockWebhookPayload.meta,
          timestamp: recentTimestamp
        }
      };

      const { validateWebhookTimestamp } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      const result = validateWebhookTimestamp(payloadWithTimestamp, 300); // 5 minute tolerance
      
      expect(result).toBe(true);
    });

    it('should handle missing webhook secret gracefully', async () => {
      delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

      const mockRequest = {
        headers: {
          get: jest.fn((key: string) => {
            if (key === 'X-Signature' || key === 'x-signature') return 'sha256=signature';
            if (key === 'Content-Type') return 'application/json';
            return null;
          })
        },
        text: jest.fn().mockResolvedValue(testPayload)
      };

      const { validateWebhookRequest } = await import('@/app/api/webhooks/lemonsqueezy/utils');
      
      const result = await validateWebhookRequest(mockRequest as any);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Webhook secret not configured');
    });
  });
});