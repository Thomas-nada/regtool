/**
 * Public Routes
 * Registration, lookup, and public data endpoints.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const router = express.Router();

const { SUBMISSIONS_DIR, TIMELINE_FILE, TOKEN_EXPIRY_DAYS } = require('../config');
const { commitToAudit } = require('../services/audit');
const { getConfig, getQuestions } = require('../services/storage');
const {
    sanitizeDeep,
    evaluateWindow,
    resolveRecordName,
    isTokenExpired,
    isValidEntryId,
    isValidToken
} = require('../utils/helpers');
const {
    strictLimiter,
    tokenLookupLimiter,
    readOnlyLimiter
} = require('../middleware/rateLimiter');
const { timingSafeCompare } = require('../middleware/auth');

// Registration status - read only
router.get('/api/registration-status', readOnlyLimiter, (req, res) => {
    const config = getConfig();
    const isRegPhase = config.isRegistrationOpen && evaluateWindow(config.regStart, config.regEnd);
    const isEditPhase = config.isEditingOpen && evaluateWindow(config.editStart, config.editEnd);

    res.json({
        isOpen: isRegPhase,
        isEditOpen: isEditPhase,
        questions: getQuestions(),
        serverUTC: new Date().toISOString(),
        version: "11.21.0"
    });
});

// Timeline - read only
router.get('/api/timeline', readOnlyLimiter, (req, res) => {
    try {
        if (fs.existsSync(TIMELINE_FILE)) {
            res.json(JSON.parse(fs.readFileSync(TIMELINE_FILE, 'utf8')));
        } else {
            res.json([]);
        }
    } catch (err) {
        res.status(500).json({ error: "Timeline unavailable." });
    }
});

// Submit new registration or update existing
router.post('/api/submit', strictLimiter, (req, res) => {
    const payload = req.body;
    const config = getConfig();
    const hasIdentity = !!(payload.entryId && payload.editToken);

    // Validate token format if provided
    if (hasIdentity) {
        if (!isValidEntryId(payload.entryId)) {
            return res.status(400).json({ error: "Invalid entry ID format." });
        }
        if (!isValidToken(payload.editToken)) {
            return res.status(400).json({ error: "Invalid token format." });
        }
    }

    const isActive = hasIdentity
        ? (config.isEditingOpen && evaluateWindow(config.editStart, config.editEnd))
        : (config.isRegistrationOpen && evaluateWindow(config.regStart, config.regEnd));

    if (!isActive) {
        commitToAudit("SUBMISSION_BLOCKED_WINDOW_CLOSED", `Action: ${hasIdentity ? 'Edit' : 'New'} | ID: ${payload.entryId || 'N/A'}`, {
            record: {
                entryId: payload.entryId || 'NEW_ATTEMPT',
                applicationType: payload.applicationType || 'Unknown',
                attemptType: hasIdentity ? 'Edit' : 'New Registration',
                sourceIP: req.ip,
                windowStatus: {
                    isRegistrationOpen: config.isRegistrationOpen,
                    isEditingOpen: config.isEditingOpen,
                    regStart: config.regStart,
                    regEnd: config.regEnd,
                    editStart: config.editStart,
                    editEnd: config.editEnd
                }
            }
        });
        return res.status(403).json({ error: "Portal window is currently closed." });
    }

    if (!sanitizeDeep(payload)) {
        commitToAudit("SUBMISSION_INTEGRITY_FAULT", `Source IP: ${req.ip}`, {
            record: {
                entryId: payload.entryId || 'NEW_ATTEMPT',
                applicationType: payload.applicationType || 'Unknown',
                sourceIP: req.ip,
                failureType: 'Data sanitization failed'
            }
        });
        return res.status(400).json({ error: "Invalid data payload." });
    }

    if (hasIdentity) {
        const files = fs.readdirSync(SUBMISSIONS_DIR).filter(f => f.endsWith('.json'));
        for (const file of files) {
            const p = path.join(SUBMISSIONS_DIR, file);
            try {
                const record = JSON.parse(fs.readFileSync(p, 'utf8'));

                if (record.entryId === payload.entryId) {
                    // Use timing-safe comparison for token
                    if (!timingSafeCompare(record.editToken, payload.editToken)) {
                        // Generic error to prevent enumeration
                        return res.status(401).json({ error: "Authentication failed." });
                    }

                    // Check token expiration
                    if (isTokenExpired(record, TOKEN_EXPIRY_DAYS)) {
                        commitToAudit("TOKEN_EXPIRED", `ID: ${record.entryId}`, { record });
                        return res.status(401).json({
                            error: "Edit token has expired. Please contact support to request a new token."
                        });
                    }

                    const beforeState = JSON.parse(JSON.stringify(record));

                    record.data = payload.data;
                    record.verified = false;
                    record.lastUpdated = new Date().toISOString();
                    fs.writeFileSync(p, JSON.stringify(record, null, 4));

                    commitToAudit("CANDIDACY_RECORD_UPDATED", `${resolveRecordName(record)} (#${record.entryId})`, {
                        before: beforeState,
                        after: record
                    });
                    return res.json({ status: "success", entryId: payload.entryId });
                }
            } catch (e) { continue; }
        }
        // Generic error to prevent enumeration
        return res.status(401).json({ error: "Authentication failed." });
    }

    // New registration
    const generatedId = Math.floor(10000000 + Math.random() * 90000000).toString();
    const secureToken = crypto.randomBytes(32).toString('hex');

    const newRecord = {
        entryId: generatedId,
        editToken: secureToken,
        applicationType: payload.applicationType,
        data: payload.data,
        verified: false,
        withdrawn: false,
        submittedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        tokenExpiresAt: new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
    };

    const storagePath = path.join(SUBMISSIONS_DIR, `${Date.now()}-${generatedId}.json`);
    try {
        fs.writeFileSync(storagePath, JSON.stringify(newRecord, null, 4));
        commitToAudit("NEW_CANDIDACY_VAULTED", `${resolveRecordName(newRecord)} (${payload.applicationType})`, {
            record: newRecord
        });
        res.json({
            entryId: generatedId,
            editToken: secureToken,
            expiresAt: newRecord.tokenExpiresAt
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to save record." });
    }
});

// Public applications list - read only
router.get('/api/applications', readOnlyLimiter, (req, res) => {
    try {
        const files = fs.readdirSync(SUBMISSIONS_DIR).filter(f => f.endsWith('.json'));
        const publicList = files
            .map(f => {
                try { return JSON.parse(fs.readFileSync(path.join(SUBMISSIONS_DIR, f), 'utf8')); }
                catch (e) { return null; }
            })
            .filter(app => app && !app.withdrawn)
            .map(({ editToken, tokenExpiresAt, ...publicRecord }) => publicRecord);

        res.json(publicList);
    } catch (err) {
        res.status(500).json({ error: "Failed to query records." });
    }
});

// Single application - read only
router.get('/api/applications/:id', readOnlyLimiter, (req, res) => {
    const targetId = req.params.id;
    const providedToken = req.query.token;

    // Validate ID format
    if (!isValidEntryId(targetId)) {
        return res.status(400).json({ error: "Invalid ID format." });
    }

    try {
        const files = fs.readdirSync(SUBMISSIONS_DIR).filter(f => f.endsWith('.json'));
        for (const f of files) {
            const record = JSON.parse(fs.readFileSync(path.join(SUBMISSIONS_DIR, f), 'utf8'));
            if (record.entryId === targetId) {
                const isOwner = providedToken && timingSafeCompare(record.editToken, providedToken);
                if ((record.verified && !record.withdrawn) || isOwner) {
                    const { editToken, tokenExpiresAt, ...publicVersion } = record;
                    return res.json(publicVersion);
                }
                // Generic error for both not found and not authorized
                return res.status(404).json({ error: "Record not found." });
            }
        }
        res.status(404).json({ error: "Record not found." });
    } catch (err) {
        res.status(500).json({ error: "Read error." });
    }
});

// Token lookup - strict rate limiting
router.post('/api/lookup', tokenLookupLimiter, (req, res) => {
    const { token } = req.body;

    // Validate token format
    if (!token || !isValidToken(token)) {
        // Use same error message to prevent enumeration
        return res.status(404).json({ error: "Record not found." });
    }

    try {
        const files = fs.readdirSync(SUBMISSIONS_DIR).filter(f => f.endsWith('.json'));
        for (const f of files) {
            const record = JSON.parse(fs.readFileSync(path.join(SUBMISSIONS_DIR, f), 'utf8'));

            // Use timing-safe comparison
            if (timingSafeCompare(record.editToken, token)) {
                // Check token expiration
                if (isTokenExpired(record, TOKEN_EXPIRY_DAYS)) {
                    commitToAudit("TOKEN_EXPIRED_LOOKUP", `ID: ${record.entryId}`, { record });
                    return res.status(401).json({
                        error: "Token has expired. Please contact support.",
                        expired: true
                    });
                }

                commitToAudit("VAULT_IDENTITY_RECOVERED", `ID: ${record.entryId} | Name: ${resolveRecordName(record)}`, {
                    record: record
                });

                // Don't return the token itself
                const { editToken: _, ...safeRecord } = record;
                return res.json(safeRecord);
            }
        }
        // Generic error - don't reveal if token exists
        res.status(404).json({ error: "Record not found." });
    } catch (err) {
        res.status(500).json({ error: "Lookup failed." });
    }
});

// Withdraw candidacy
router.post('/api/withdraw', strictLimiter, (req, res) => {
    const { entryId, editToken } = req.body;

    // Validate inputs
    if (!isValidEntryId(entryId) || !isValidToken(editToken)) {
        return res.status(400).json({ error: "Invalid request." });
    }

    try {
        const files = fs.readdirSync(SUBMISSIONS_DIR).filter(f => f.endsWith('.json'));
        for (const f of files) {
            const p = path.join(SUBMISSIONS_DIR, f);
            const record = JSON.parse(fs.readFileSync(p, 'utf8'));

            if (record.entryId === entryId) {
                // Use timing-safe comparison
                if (!timingSafeCompare(record.editToken, editToken)) {
                    return res.status(401).json({ error: "Authentication failed." });
                }

                // Check token expiration
                if (isTokenExpired(record, TOKEN_EXPIRY_DAYS)) {
                    return res.status(401).json({ error: "Token has expired." });
                }

                const beforeState = JSON.parse(JSON.stringify(record));

                record.withdrawn = true;
                record.verified = false;
                record.lastUpdated = new Date().toISOString();

                fs.writeFileSync(p, JSON.stringify(record, null, 4));
                commitToAudit("CANDIDACY_WITHDRAWN", `${resolveRecordName(record)} (#${entryId})`, {
                    before: beforeState,
                    after: record
                });
                return res.json({ success: true });
            }
        }
        res.status(401).json({ error: "Authentication failed." });
    } catch (err) {
        res.status(500).json({ error: "Operation failed." });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: "OK",
        version: "11.21.0",
        uptimeSeconds: Math.floor(process.uptime()),
        systemUTC: new Date().toUTCString()
    });
});

module.exports = router;
