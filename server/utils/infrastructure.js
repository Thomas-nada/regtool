/**
 * Infrastructure Setup
 * Directory and file initialization on startup.
 */
const fs = require('fs');
const {
    SUBMISSIONS_DIR,
    ARCHIVED_DIR,
    LOGS_DIR,
    AUDIT_CHAIN_FILE,
    TEAMS_FILE,
    TIMELINE_FILE
} = require('../config');
const { generateBlockHash } = require('../services/audit');

function verifyInfrastructure() {
    console.log("Verifying infrastructure...");

    const requiredDirs = [SUBMISSIONS_DIR, ARCHIVED_DIR, LOGS_DIR];
    requiredDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            try {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`Created directory: ${dir}`);
            } catch (err) {
                console.error(`Failed to create directory ${dir}`, err);
                process.exit(1);
            }
        }
    });

    if (!fs.existsSync(AUDIT_CHAIN_FILE)) {
        try {
            const genesisBlock = {
                index: 0,
                timestamp: new Date().toISOString(),
                event: "GENESIS_BLOCK",
                context: "Audit chain initialized",
                previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
                changes: null,
                reason: null,
                snapshot: null,
                hash: ""
            };
            genesisBlock.hash = generateBlockHash(genesisBlock);
            fs.writeFileSync(AUDIT_CHAIN_FILE, JSON.stringify([genesisBlock], null, 2));
            console.log("Initialized audit chain.");
        } catch (err) {
            console.error("Failed to initialize audit chain.", err);
        }
    }

    if (!fs.existsSync(TEAMS_FILE)) {
        const defaultTeams = ["Gov Team", "DQuadrant", "Ekklesia", "Civics Committee", "Intersect"];
        try {
            fs.writeFileSync(TEAMS_FILE, JSON.stringify(defaultTeams, null, 4));
            console.log("Initialized teams registry.");
        } catch (err) {
            console.error("Failed to initialize teams file.", err);
        }
    }

    if (!fs.existsSync(TIMELINE_FILE)) {
        try {
            fs.writeFileSync(TIMELINE_FILE, JSON.stringify([], null, 4));
            console.log("Initialized timeline.");
        } catch (err) {
            console.error("Failed to initialize timeline.", err);
        }
    }

    console.log("Infrastructure check complete.");
}

module.exports = { verifyInfrastructure };
