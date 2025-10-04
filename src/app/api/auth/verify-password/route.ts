import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// Rate limiting store (in-memory, resets on server restart)
// For production, consider using Redis or similar
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitStore.entries()) {
    if (now > data.resetAt) {
      rateLimitStore.delete(ip);
    }
  }
}, 10 * 60 * 1000);

function getRateLimitKey(request: NextRequest): string {
  // Use X-Forwarded-For header if available (for proxied requests)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Fallback to direct IP
  const ip = request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxAttempts = 5;

  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    // New window
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + windowMs
    });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: maxAttempts - record.count };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const ip = getRateLimitKey(request);
    const rateLimit = checkRateLimit(ip);

    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded for IP:', ip);
      return NextResponse.json(
        {
          success: false,
          error: 'Too many attempts. Please try again later.'
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + 10 * 60 * 1000).toISOString()
          }
        }
      );
    }

    const body = await request.json();
    const { password, nickname } = body;

    // Validate input
    if (!password || typeof password !== 'string') {
      logger.warn('Invalid password format from IP:', ip);
      return NextResponse.json(
        { success: false, error: 'Invalid password format' },
        { status: 400 }
      );
    }

    if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
      logger.warn('Invalid nickname format from IP:', ip);
      return NextResponse.json(
        { success: false, error: 'Nickname is required' },
        { status: 400 }
      );
    }

    // Validate nickname length and characters
    if (nickname.trim().length > 50) {
      return NextResponse.json(
        { success: false, error: 'Nickname must be 50 characters or less' },
        { status: 400 }
      );
    }

    // Get password from environment variable (server-side only)
    const correctPassword = process.env.EDIT_PASSWORD;

    if (!correctPassword) {
      logger.error('EDIT_PASSWORD environment variable is not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify password
    if (password === correctPassword) {
      logger.info('Successful authentication for nickname:', nickname.trim(), 'from IP:', ip);

      // Clear rate limit on successful login
      rateLimitStore.delete(ip);

      return NextResponse.json(
        {
          success: true,
          nickname: nickname.trim()
        },
        {
          headers: {
            'X-RateLimit-Remaining': '5'
          }
        }
      );
    }

    logger.warn('Failed authentication attempt from IP:', ip);
    return NextResponse.json(
      {
        success: false,
        error: 'Incorrect password'
      },
      {
        status: 401,
        headers: {
          'X-RateLimit-Remaining': rateLimit.remaining.toString()
        }
      }
    );

  } catch (error) {
    logger.error('Error in password verification:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Prevent GET requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
