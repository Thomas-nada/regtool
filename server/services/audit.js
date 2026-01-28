/**
 * Audit Service
 * Blockchain-style audit chain with SHA-256 hashing.
 */
const fs = require('fs');
const crypto = require('crypto');
const { AUDIT_CHAIN_FILE } = require('../config');

function generateBlockHash(block) {
    const blockData = [
        block.index,
        block.timestamp,
        block.event,
        block.context,
        block.previousHash,
        JSON.stringify(block.changes),
        block.reason || '',
        JSON.stringify(block.snapshot || null)
    ].join('|');
    return crypto.createHash('sha256').update(blockData).digest('hex');
}

function createRecordSnapshot(record) {
    if (!record) return null;

    const snapshot = {
        entryId: record.entryId,
        applicationType: record.applicationType,
        verified: record.verified,
        withdrawn: record.withdrawn,
        archived: record.archived || false,
        submittedAt: record.submittedAt,
        lastUpdated: record.lastUpdated
    };

    if (record.data) {
        const d = record.data;
        snapshot.displayName = d['individual-name'] || d['consortium-name'] || d['org-name'] ||
                               d['q_1769085576918'] || d['q1768839882885'] || d['q_1769085297138'] ||
                               d.name || `Record #${record.entryId}`;

        snapshot.fields = {};
        for (const [key, value] of Object.entries(d)) {
            if (typeof value === 'string' && !value.startsWith('data:image')) {
                snapshot.fields[key] = value.substring(0, 500);
            } else if (typeof value !== 'string') {
                snapshot.fields[key] = value;
            }
        }
    }

    return snapshot;
}

function commitToAudit(event, context = "", meta = null) {
    try {
        const timestamp = new Date().toISOString();
        let cleanChanges = null;
        let cleanReason = null;
        let snapshot = null;

        if (meta) {
            if (meta.changes) {
                cleanChanges = meta.changes.replace(/[\n\r]/g, " ").substring(0, 500);
            }
            if (meta.reason) {
                cleanReason = meta.reason.replace(/[\n\r]/g, " ").substring(0, 500);
            }

            if (meta.before || meta.after) {
                snapshot = {
                    before: createRecordSnapshot(meta.before),
                    after: createRecordSnapshot(meta.after)
                };
            } else if (meta.record) {
                snapshot = {
                    record: createRecordSnapshot(meta.record)
                };
            }
        }

        try {
            let chain = [];
            if (fs.existsSync(AUDIT_CHAIN_FILE)) {
                chain = JSON.parse(fs.readFileSync(AUDIT_CHAIN_FILE, 'utf8'));
            }

            const lastBlock = chain.length > 0 ? chain[chain.length - 1] : null;
            const previousHash = lastBlock ? lastBlock.hash : "0000000000000000000000000000000000000000000000000000000000000000";

            const newBlock = {
                index: chain.length,
                timestamp: timestamp,
                event: event,
                context: context,
                changes: cleanChanges,
                reason: cleanReason,
                snapshot: snapshot,
                previousHash: previousHash,
                hash: ""
            };

            newBlock.hash = generateBlockHash(newBlock);
            chain.push(newBlock);
            fs.writeFileSync(AUDIT_CHAIN_FILE, JSON.stringify(chain, null, 2));
        } catch (chainErr) {
            console.error("Audit chain write error:", chainErr);
        }
    } catch (err) {
        console.error("Audit error:", err);
    }
}

module.exports = {
    generateBlockHash,
    createRecordSnapshot,
    commitToAudit
};
