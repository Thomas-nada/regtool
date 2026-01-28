/**
 * Authentication Middleware
 * Admin authorization with timing-safe comparison.
 */
const crypto = require('crypto');
const { ADMIN_TOKEN, AUDIT_REPAIR_KEY } = require('../config');
const { commitToAudit } = require('../services/audit');

// Track failed attempts for basic brute-force protection
const failedAttempts = new Map();
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function cleanupFailedAttempts() {
    const now = Date.now();
    for (const [ip, data] of failedAttempts.entries()) {
        if (now - data.lastAttempt > LOCKOUT_DURATION_MS) {
            failedAttempts.delete(ip);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupFailedAttempts, 5 * 60 * 1000);

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    // If lengths differ, still do comparison to maintain constant time
    if (bufA.length !== bufB.length) {
        // Compare against self to maintain timing consistency
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Admin authorization middleware
 */
const authorizeAdmin = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;

    // Check if IP is locked out
    const attemptData = failedAttempts.get(ip);
    if (attemptData && attemptData.count >= LOCKOUT_THRESHOLD) {
        const timeRemaining = LOCKOUT_DURATION_MS - (Date.now() - attemptData.lastAttempt);
        if (timeRemaining > 0) {
            commitToAudit("ADMIN_LOCKOUT_ACTIVE", `IP: ${ip} | Remaining: ${Math.ceil(timeRemaining / 1000)}s`);
            return res.status(429).json({
                error: "Too many failed attempts. Try again later.",
                retryAfter: Math.ceil(timeRemaining / 1000)
            });
        } else {
            failedAttempts.delete(ip);
        }
    }

    let providedToken = req.headers['authorization'] || req.headers['x-admin-token'];

    if (providedToken && providedToken.startsWith('Bearer ')) {
        providedToken = providedToken.slice(7);
    }

    if (!providedToken) {
        return res.status(401).json({ error: "Authorization required." });
    }

    if (timingSafeCompare(providedToken, ADMIN_TOKEN)) {
        // Reset failed attempts on success
        failedAttempts.delete(ip);
        return next();
    }

    // Track failed attempt
    const current = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    current.count++;
    current.lastAttempt = Date.now();
    failedAttempts.set(ip, current);

    console.warn(`Blocked unauthorized admin attempt from ${ip} (attempt ${current.count})`);
    commitToAudit("UNAUTHORIZED_ACCESS_BLOCK", `Source IP: ${ip} | Route: ${req.originalUrl} | Attempt: ${current.count}`);

    res.status(401).json({ error: "Authorization required." });
};

/**
 * Audit repair authorization - requires separate key
 */
const authorizeAuditRepair = (req, res, next) => {
    if (!AUDIT_REPAIR_KEY) {
        return res.status(403).json({
            error: "Audit chain repair is disabled. Set AUDIT_REPAIR_KEY environment variable to enable."
        });
    }

    const repairKey = req.headers['x-audit-repair-key'];

    if (!repairKey || !timingSafeCompare(repairKey, AUDIT_REPAIR_KEY)) {
        const ip = req.ip || req.connection.remoteAddress;
        commitToAudit("AUDIT_REPAIR_UNAUTHORIZED", `IP: ${ip}`);
        return res.status(403).json({ error: "Audit repair key required." });
    }

    next();
};

module.exports = {
    authorizeAdmin,
    authorizeAuditRepair,
    timingSafeCompare
};
