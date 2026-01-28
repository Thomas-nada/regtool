/**
 * Utility Helpers
 * Sanitization, validation, and name resolution.
 */
const xss = require('xss');

// XSS filter options - strict configuration
const xssOptions = {
    whiteList: {}, // No HTML tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'frame', 'object', 'embed'],
    onTag: function(tag, html, options) {
        // Strip all tags
        return '';
    },
    onTagAttr: function(tag, name, value, isWhiteAttr) {
        // Strip all attributes
        return '';
    }
};

const xssFilter = new xss.FilterXSS(xssOptions);

/**
 * Sanitize a single value
 */
function sanitizeValue(val) {
    if (typeof val !== 'string') return val;

    // Allow base64 images but limit size
    if (val.startsWith('data:image')) {
        const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
        if (val.length > MAX_IMAGE_SIZE) {
            return val.substring(0, MAX_IMAGE_SIZE);
        }
        return val;
    }

    const MAX_TEXT_SIZE = 50000; // 50KB for text fields
    let sanitized = val.substring(0, MAX_TEXT_SIZE);

    // Apply XSS filter
    sanitized = xssFilter.process(sanitized);

    // Additional cleanup
    sanitized = sanitized
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, function(match, offset, string) {
            // Only allow data: at start for images (already handled above)
            return offset === 0 ? match : '';
        })
        .replace(/vbscript:/gi, '')
        .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=, onerror=
        .trim();

    return sanitized;
}

/**
 * Recursively sanitize all values in an object
 */
function processRecursive(node) {
    if (Array.isArray(node)) {
        return node.map(item => processRecursive(item));
    } else if (typeof node === 'object' && node !== null) {
        const cleanObj = {};
        for (const key in node) {
            // Also sanitize keys to prevent prototype pollution
            const cleanKey = String(key).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 100);
            if (cleanKey && cleanKey !== '__proto__' && cleanKey !== 'constructor' && cleanKey !== 'prototype') {
                cleanObj[cleanKey] = processRecursive(node[key]);
            }
        }
        return cleanObj;
    }
    return sanitizeValue(node);
}

/**
 * Sanitize submission payload
 */
function sanitizeDeep(payload) {
    if (!payload || typeof payload !== 'object' || !payload.data) {
        return false;
    }

    try {
        const data = payload.data;
        for (const key in data) {
            data[key] = processRecursive(data[key]);
        }
        return true;
    } catch (err) {
        console.error('Sanitization error:', err);
        return false;
    }
}

/**
 * Check if current time is within the specified window
 * SECURITY: Fails closed - returns false if dates are invalid/missing
 */
function evaluateWindow(startISO, endISO) {
    // Fail closed: if dates are missing or invalid, window is CLOSED
    if (!startISO || !endISO) {
        return false;
    }

    try {
        const now = new Date();
        const start = new Date(startISO);
        const end = new Date(endISO);

        // Validate dates are valid
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.warn('Invalid date format in window evaluation');
            return false;
        }

        // Validate end is after start
        if (end <= start) {
            console.warn('End date must be after start date');
            return false;
        }

        return now >= start && now <= end;
    } catch (err) {
        console.error('Window evaluation error:', err);
        return false;
    }
}

/**
 * Extract display name from record data
 */
function resolveRecordName(record) {
    if (!record || !record.data) return "Unknown";
    const d = record.data;

    const namePrio = [
        d.q_1769085576918,
        d.q_1769085297138,
        d.q1768839882885,
        d['individual-name'],
        d['consortium-name'],
        d['org-name'],
        d.name,
        d.orgName,
        d.fullName,
        d.displayName
    ];

    for (const name of namePrio) {
        if (name && typeof name === 'string' && name.trim()) {
            // Sanitize the name before returning
            return sanitizeValue(name.trim()).substring(0, 200);
        }
    }

    return `Record #${record.entryId}`;
}

/**
 * Check if a token has expired
 */
function isTokenExpired(record, expiryDays) {
    if (!record || !record.submittedAt) return true;

    try {
        const submittedDate = new Date(record.submittedAt);
        const expiryDate = new Date(submittedDate.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
        return new Date() > expiryDate;
    } catch (err) {
        return true;
    }
}

/**
 * Validate entry ID format
 */
function isValidEntryId(id) {
    if (!id || typeof id !== 'string') return false;
    return /^\d{8}$/.test(id);
}

/**
 * Validate token format (64 hex characters)
 */
function isValidToken(token) {
    if (!token || typeof token !== 'string') return false;
    return /^[a-f0-9]{64}$/i.test(token);
}

module.exports = {
    sanitizeDeep,
    sanitizeValue,
    evaluateWindow,
    resolveRecordName,
    isTokenExpired,
    isValidEntryId,
    isValidToken
};
