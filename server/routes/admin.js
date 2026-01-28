/**
 * Admin Routes
 * Protected endpoints for system management.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const {
    SUBMISSIONS_DIR,
    ARCHIVED_DIR,
    TIMELINE_FILE,
    TEAMS_FILE,
    AUDIT_CHAIN_FILE
} = require('../config');
const { authorizeAdmin, authorizeAuditRepair } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');
const { commitToAudit, generateBlockHash } = require('../services/audit');
const {
    getConfig,
    setConfig,
    syncPortalConfig,
    getQuestions,
    setQuestions,
    syncPortalQuestions
} = require('../services/storage');
const { resolveRecordName, isValidEntryId } = require('../utils/helpers');

// Apply rate limiting and auth middleware to all admin routes
router.use(adminLimiter);
router.use(authorizeAdmin);

router.get('/api/admin/audit-chain', (req, res) => {
    try {
        if (fs.existsSync(AUDIT_CHAIN_FILE)) {
            const chain = JSON.parse(fs.readFileSync(AUDIT_CHAIN_FILE, 'utf8'));
            res.json(chain.slice().reverse());
        } else {
            res.json([]);
        }
    } catch (err) {
        res.status(500).send("Audit chain read error.");
    }
});

router.get('/api/admin/audit-chain/verify', (req, res) => {
    try {
        if (!fs.existsSync(AUDIT_CHAIN_FILE)) {
            return res.json({ valid: false, error: "Audit chain does not exist.", blocks: [] });
        }

        const chain = JSON.parse(fs.readFileSync(AUDIT_CHAIN_FILE, 'utf8'));
        const verification = {
            valid: true,
            totalBlocks: chain.length,
            invalidBlocks: [],
            blocks: []
        };

        for (let i = 0; i < chain.length; i++) {
            const block = chain[i];
            const blockVerification = {
                index: block.index,
                timestamp: block.timestamp,
                event: block.event,
                hashValid: false,
                previousHashValid: false,
                storedHash: block.hash,
                computedHash: null
            };

            const computedHash = generateBlockHash(block);
            blockVerification.computedHash = computedHash;
            blockVerification.hashValid = (computedHash === block.hash);

            if (i === 0) {
                blockVerification.previousHashValid = (block.previousHash === "0000000000000000000000000000000000000000000000000000000000000000");
            } else {
                blockVerification.previousHashValid = (block.previousHash === chain[i - 1].hash);
            }

            if (!blockVerification.hashValid || !blockVerification.previousHashValid) {
                verification.valid = false;
                verification.invalidBlocks.push(i);
            }

            verification.blocks.push(blockVerification);
        }

        res.json(verification);
    } catch (err) {
        console.error("Chain verification error:", err);
        res.status(500).json({ valid: false, error: err.message });
    }
});

// CRITICAL: Audit chain repair requires separate authorization key
router.post('/api/admin/audit-chain/repair', authorizeAuditRepair, (req, res) => {
    try {
        if (!fs.existsSync(AUDIT_CHAIN_FILE)) {
            return res.status(404).json({ error: "Audit chain does not exist." });
        }

        const chain = JSON.parse(fs.readFileSync(AUDIT_CHAIN_FILE, 'utf8'));
        const repairedChain = [];

        for (let i = 0; i < chain.length; i++) {
            const block = chain[i];

            if (block.snapshot === undefined) {
                block.snapshot = null;
            }

            if (i === 0) {
                block.previousHash = "0000000000000000000000000000000000000000000000000000000000000000";
            } else {
                block.previousHash = repairedChain[i - 1].hash;
            }

            block.hash = generateBlockHash(block);
            repairedChain.push(block);
        }

        fs.writeFileSync(AUDIT_CHAIN_FILE, JSON.stringify(repairedChain, null, 2));
        commitToAudit("AUDIT_CHAIN_REPAIRED", `Chain integrity restored. ${repairedChain.length} blocks recomputed.`);

        res.json({
            ok: true,
            message: "Chain repaired successfully",
            blocksRepaired: repairedChain.length
        });
    } catch (err) {
        console.error("Chain repair error:", err);
        res.status(500).json({ error: "Repair operation failed." });
    }
});

router.get('/api/admin/audit-chain/export', (req, res) => {
    try {
        if (!fs.existsSync(AUDIT_CHAIN_FILE)) {
            return res.status(404).json({ error: "Audit chain does not exist." });
        }

        const chain = JSON.parse(fs.readFileSync(AUDIT_CHAIN_FILE, 'utf8'));
        let report = [];

        report.push("═══════════════════════════════════════════════════════════════════════════════");
        report.push("                         CRYPTOGRAPHIC AUDIT TRAIL REPORT");
        report.push("═══════════════════════════════════════════════════════════════════════════════");
        report.push("");
        report.push(`Generated: ${new Date().toISOString()}`);
        report.push(`Total Entries: ${chain.length}`);
        report.push(`Chain Start: ${chain.length > 0 ? chain[0].timestamp : 'N/A'}`);
        report.push(`Chain End: ${chain.length > 0 ? chain[chain.length - 1].timestamp : 'N/A'}`);
        report.push("");
        report.push("VERIFICATION INSTRUCTIONS:");
        report.push("Each entry contains a SHA-256 hash computed from: index, timestamp, event,");
        report.push("context, previousHash, changes, reason, and snapshot data.");
        report.push("To verify: recompute each hash and confirm it matches, and that each");
        report.push("entry's previousHash matches the prior entry's hash.");
        report.push("");
        report.push("═══════════════════════════════════════════════════════════════════════════════");
        report.push("                              AUDIT ENTRIES");
        report.push("═══════════════════════════════════════════════════════════════════════════════");

        for (const block of chain) {
            report.push("");
            report.push(`───────────────────────────────────────────────────────────────────────────────`);
            report.push(`ENTRY #${block.index}`);
            report.push(`───────────────────────────────────────────────────────────────────────────────`);
            report.push(`Timestamp:     ${block.timestamp}`);
            report.push(`Event:         ${block.event}`);
            report.push(`Context:       ${block.context || '(none)'}`);

            if (block.changes) report.push(`Changes:       ${block.changes}`);
            if (block.reason) report.push(`Reason:        ${block.reason}`);

            report.push("");
            report.push(`Hash:          ${block.hash}`);
            report.push(`Previous Hash: ${block.previousHash}`);

            if (block.snapshot) {
                report.push("");
                report.push("SNAPSHOT DATA:");
                const snapshotData = block.snapshot.record || block.snapshot.after || block.snapshot.before;
                if (snapshotData) {
                    report.push(`  Entry ID: ${snapshotData.entryId}`);
                    report.push(`  Type: ${snapshotData.applicationType}`);
                    report.push(`  Display Name: ${snapshotData.displayName || 'N/A'}`);
                    report.push(`  Verified: ${snapshotData.verified}`);
                }
            }
        }

        report.push("");
        report.push("═══════════════════════════════════════════════════════════════════════════════");
        report.push("                              END OF REPORT");
        report.push("═══════════════════════════════════════════════════════════════════════════════");

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="audit-report-${new Date().toISOString().split('T')[0]}.txt"`);
        res.send(report.join('\n'));

    } catch (err) {
        console.error("Export error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/api/admin/config', (req, res) => {
    res.json(getConfig());
});

router.post('/api/admin/config', (req, res) => {
    const { auditMeta, ...newSettings } = req.body;
    const cleanSettings = newSettings.data || newSettings;
    const beforeConfig = JSON.parse(JSON.stringify(getConfig()));

    setConfig(cleanSettings);
    syncPortalConfig();

    commitToAudit("SYSTEM_CONFIG_UPDATED", "Operational timestamps modified.", {
        ...auditMeta,
        before: { configSnapshot: beforeConfig },
        after: { configSnapshot: getConfig() }
    });
    res.json({ ok: true });
});

router.get('/api/admin/questions', (req, res) => {
    res.json(getQuestions());
});

router.post('/api/admin/questions', (req, res) => {
    const { data, auditMeta } = req.body;
    const beforeQuestions = JSON.parse(JSON.stringify(getQuestions()));

    setQuestions(data || req.body.questions || req.body);
    syncPortalQuestions();

    commitToAudit("FORM_ARCHITECT_RECONFIGURED", "Global schema modified.", {
        ...auditMeta,
        before: { formSchema: beforeQuestions },
        after: { formSchema: getQuestions() }
    });
    res.json({ ok: true });
});

router.post('/api/admin/archive', (req, res) => {
    const { entryId, auditMeta } = req.body;

    if (!isValidEntryId(entryId)) {
        return res.status(400).json({ error: "Invalid entry ID format." });
    }

    try {
        const files = fs.readdirSync(SUBMISSIONS_DIR).filter(f => f.endsWith('.json'));
        for (const f of files) {
            const oldPath = path.join(SUBMISSIONS_DIR, f);
            const record = JSON.parse(fs.readFileSync(oldPath, 'utf8'));

            if (record.entryId === entryId) {
                const beforeState = JSON.parse(JSON.stringify(record));
                const newPath = path.join(ARCHIVED_DIR, f);

                record.archived = true;
                record.archivedAt = new Date().toISOString();
                record.verified = false;

                fs.writeFileSync(newPath, JSON.stringify(record, null, 4));
                fs.unlinkSync(oldPath);

                commitToAudit("ADMIN_RECORD_ARCHIVED", `ID: ${entryId} | Name: ${resolveRecordName(record)}`, {
                    ...(auditMeta || {}),
                    before: beforeState,
                    after: record
                });
                return res.json({ ok: true });
            }
        }
        res.status(404).send("Record not found.");
    } catch (err) {
        console.error("Archive error:", err);
        res.status(500).send("Archive failed.");
    }
});

router.post('/api/admin/restore', (req, res) => {
    const { entryId, auditMeta } = req.body;

    if (!isValidEntryId(entryId)) {
        return res.status(400).json({ error: "Invalid entry ID format." });
    }

    try {
        const files = fs.readdirSync(ARCHIVED_DIR).filter(f => f.endsWith('.json'));
        for (const f of files) {
            const oldPath = path.join(ARCHIVED_DIR, f);
            const record = JSON.parse(fs.readFileSync(oldPath, 'utf8'));

            if (record.entryId === entryId) {
                const beforeState = JSON.parse(JSON.stringify(record));
                const newPath = path.join(SUBMISSIONS_DIR, f);

                record.archived = false;
                delete record.archivedAt;

                fs.writeFileSync(newPath, JSON.stringify(record, null, 4));
                fs.unlinkSync(oldPath);

                commitToAudit("ADMIN_RECORD_RESTORED", `ID: ${entryId} | Name: ${resolveRecordName(record)}`, {
                    ...(auditMeta || {}),
                    before: beforeState,
                    after: record
                });
                return res.json({ ok: true });
            }
        }
        res.status(404).send("Archived record not found.");
    } catch (err) {
        console.error("Restore error:", err);
        res.status(500).send("Restore failed.");
    }
});

router.get('/api/admin/applications', (req, res) => {
    try {
        const getList = (dir, status) => fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
            try {
                const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
                r.archived = status;
                return r;
            } catch(e) { return null; }
        }).filter(r => r !== null);

        const totalRegistry = [
            ...getList(SUBMISSIONS_DIR, false),
            ...getList(ARCHIVED_DIR, true)
        ];

        res.json(totalRegistry);
    } catch (err) {
        res.status(500).json({ error: "Failed to retrieve registry." });
    }
});

router.post('/api/admin/verify', (req, res) => {
    const { entryId, verified, status, auditMeta } = req.body;

    if (!isValidEntryId(entryId)) {
        return res.status(400).json({ error: "Invalid entry ID format." });
    }

    const finalStatus = verified !== undefined ? verified : status;
    const files = fs.readdirSync(SUBMISSIONS_DIR).filter(f => f.endsWith('.json'));
    for (const f of files) {
        const p = path.join(SUBMISSIONS_DIR, f);
        try {
            const record = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (record.entryId === entryId) {
                const beforeState = JSON.parse(JSON.stringify(record));

                record.verified = !!finalStatus;
                record.lastUpdated = new Date().toISOString();
                fs.writeFileSync(p, JSON.stringify(record, null, 4));

                const eventType = record.verified ? "ADMIN_IDENTITY_VERIFICATION" : "ADMIN_VERIFICATION_REVOKED";
                commitToAudit(eventType, `ID: ${entryId} | Identity: ${resolveRecordName(record)}`, {
                    ...(auditMeta || {}),
                    before: beforeState,
                    after: record
                });

                return res.json({ ok: true, verified: record.verified });
            }
        } catch (e) { continue; }
    }
    res.status(404).send("Record not found.");
});

router.post('/api/admin/delete', (req, res) => {
    const { entryId, auditMeta } = req.body;

    if (!isValidEntryId(entryId)) {
        return res.status(400).json({ error: "Invalid entry ID format." });
    }

    const targets = [SUBMISSIONS_DIR, ARCHIVED_DIR];

    for (const dir of targets) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
        for (const f of files) {
            const p = path.join(dir, f);
            try {
                const record = JSON.parse(fs.readFileSync(p, 'utf8'));
                if (record.entryId === entryId) {
                    const name = resolveRecordName(record);
                    fs.unlinkSync(p);
                    commitToAudit("ADMIN_RECORD_PURGE", `ID: ${entryId} | Subject: ${name}`, {
                        ...(auditMeta || {}),
                        before: record,
                        after: null
                    });
                    return res.json({ ok: true });
                }
            } catch (e) { continue; }
        }
    }
    res.status(404).send("Record not found.");
});

router.get('/api/admin/timeline', (req, res) => {
    try {
        if (fs.existsSync(TIMELINE_FILE)) res.json(JSON.parse(fs.readFileSync(TIMELINE_FILE, 'utf8')));
        else res.json([]);
    } catch (err) { res.status(500).json({ error: "Read error." }); }
});

router.post('/api/admin/timeline', (req, res) => {
    const { data, auditMeta } = req.body;
    const finalData = data || req.body;
    try {
        let beforeTimeline = [];
        if (fs.existsSync(TIMELINE_FILE)) {
            beforeTimeline = JSON.parse(fs.readFileSync(TIMELINE_FILE, 'utf8'));
        }

        fs.writeFileSync(TIMELINE_FILE, JSON.stringify(finalData, null, 4));

        commitToAudit("TIMELINE_UPDATED", "Public election roadmap synchronized.", {
            ...auditMeta,
            before: { timeline: beforeTimeline },
            after: { timeline: finalData }
        });
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: "Save failed." }); }
});

router.get('/api/admin/teams', (req, res) => {
    try {
        if (fs.existsSync(TEAMS_FILE)) res.json(JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf8')));
        else res.json([]);
    } catch (err) { res.status(500).json({ error: "Read error." }); }
});

router.post('/api/admin/teams', (req, res) => {
    const { data, auditMeta } = req.body;
    const finalData = data || req.body;
    try {
        let beforeTeams = [];
        if (fs.existsSync(TEAMS_FILE)) {
            beforeTeams = JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf8'));
        }

        fs.writeFileSync(TEAMS_FILE, JSON.stringify(finalData, null, 4));

        commitToAudit("TEAMS_REGISTRY_UPDATED", "Authorized teams modified.", {
            ...auditMeta,
            before: { teams: beforeTeams },
            after: { teams: finalData }
        });
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: "Save failed." }); }
});

router.get('/api/admin/export', (req, res) => {
    try {
        const getRecords = (dir) => fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
            try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch(e) { return null; }
        }).filter(r => r !== null);

        const records = [...getRecords(SUBMISSIONS_DIR), ...getRecords(ARCHIVED_DIR)];
        let csv = "ID,Track,DisplayName,Status,Verified,SubmittedUTC,LastModifiedUTC\n";

        records.forEach(r => {
            const status = r.archived ? "ARCHIVED" : (r.withdrawn ? "WITHDRAWN" : (r.verified ? "VERIFIED" : "PENDING"));
            const displayName = resolveRecordName(r).replace(/,/g, "");
            csv += `${r.entryId},${r.applicationType},${displayName},${status},${r.verified},${r.submittedAt},${r.lastUpdated}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.attachment(`audit_report_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (err) {
        res.status(500).send("Export failed.");
    }
});

module.exports = router;
