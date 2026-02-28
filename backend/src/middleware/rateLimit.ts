import rateLimit from 'express-rate-limit';

// General API rate limiter: 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET', // Don't limit GET requests as strictly
});

// Strict rate limiter for auth endpoints: 5 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Location upload limiter: 1000 requests per minute (for high-frequency tracking)
export const locationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: 'Too many location updates, please try again later.',
  standardHeaders: false,
  legacyHeaders: false,
});

// Search/query limiter: 50 requests per minute
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: 'Too many search requests, please try again later.',
  standardHeaders: false,
  legacyHeaders: false,
});

export default {
  apiLimiter,
  authLimiter,
  locationLimiter,
  searchLimiter,
};
