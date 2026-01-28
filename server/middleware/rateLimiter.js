/**
 * Rate Limiting Middleware
 * Configurable rate limits for different endpoint types.
 */
const rateLimit = require('express-rate-limit');

// General API rate limit
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Strict limit for sensitive operations (submit, lookup, withdraw)
const strictLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // 10 requests per window
    message: { error: 'Rate limit exceeded for this operation. Please wait before trying again.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Very strict limit for token lookup (prevent brute-force)
const tokenLookupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: 'Too many lookup attempts. Please wait 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
});

// Admin endpoint limiter
const adminLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // 50 requests per window
    message: { error: 'Admin rate limit exceeded.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Read-only endpoints (applications list, timeline, etc.)
const readOnlyLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: { error: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    generalLimiter,
    strictLimiter,
    tokenLookupLimiter,
    adminLimiter,
    readOnlyLimiter
};
