/**
 * Server Configuration
 * Paths, environment variables, and initial state.
 */
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');
const SUBMISSIONS_DIR = path.join(BASE_DIR, 'submissions');
const ARCHIVED_DIR = path.join(SUBMISSIONS_DIR, 'archived');
const LOGS_DIR = path.join(BASE_DIR, 'logs');
const CONFIG_FILE = path.join(BASE_DIR, 'portal_config.json');
const QUESTIONS_FILE = path.join(BASE_DIR, 'portal_questions.json');
const TIMELINE_FILE = path.join(BASE_DIR, 'timeline.json');
const TEAMS_FILE = path.join(BASE_DIR, 'teams.json');
const AUDIT_CHAIN_FILE = path.join(LOGS_DIR, 'audit_chain.json');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Admin token - REQUIRED in production
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!ADMIN_TOKEN) {
    if (IS_PRODUCTION) {
        console.error('FATAL: ADMIN_TOKEN environment variable is required in production.');
        console.error('Set it with: export ADMIN_TOKEN="your-secure-token-here"');
        process.exit(1);
    } else {
        console.warn('WARNING: ADMIN_TOKEN not set. Using insecure default for development only.');
        console.warn('Set ADMIN_TOKEN environment variable before deploying to production.');
    }
}
const EFFECTIVE_ADMIN_TOKEN = ADMIN_TOKEN || 'dev-only-insecure-token';

// Audit chain repair key - separate from admin token for extra security
const AUDIT_REPAIR_KEY = process.env.AUDIT_REPAIR_KEY;
if (!AUDIT_REPAIR_KEY && IS_PRODUCTION) {
    console.warn('WARNING: AUDIT_REPAIR_KEY not set. Audit chain repair will be disabled.');
}

// CORS allowed origins
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : (IS_PRODUCTION ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000']);

// Token expiration (in days)
const TOKEN_EXPIRY_DAYS = parseInt(process.env.TOKEN_EXPIRY_DAYS) || 90;

module.exports = {
    BASE_DIR,
    SUBMISSIONS_DIR,
    ARCHIVED_DIR,
    LOGS_DIR,
    CONFIG_FILE,
    QUESTIONS_FILE,
    TIMELINE_FILE,
    TEAMS_FILE,
    AUDIT_CHAIN_FILE,
    PORT,
    NODE_ENV,
    IS_PRODUCTION,
    ADMIN_TOKEN: EFFECTIVE_ADMIN_TOKEN,
    AUDIT_REPAIR_KEY,
    ALLOWED_ORIGINS,
    TOKEN_EXPIRY_DAYS
};
