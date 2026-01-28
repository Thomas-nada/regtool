/**
 * CC Election Portal - Backend Server
 * Version: 11.21.0 (Security Hardened)
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');

const { PORT, BASE_DIR, IS_PRODUCTION, ALLOWED_ORIGINS } = require('./config');
const { verifyInfrastructure } = require('./utils/infrastructure');
const { loadConfig, loadQuestions } = require('./services/storage');
const { commitToAudit } = require('./services/audit');
const { generalLimiter } = require('./middleware/rateLimiter');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

// Initialize infrastructure
verifyInfrastructure();

// Load persisted state
loadConfig();
loadQuestions();

// Create Express app
const app = express();

// Trust proxy for accurate IP detection behind reverse proxies
app.set('trust proxy', 1);

// Security headers with Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"], // Allow onclick handlers (needed for existing HTML)
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            frameAncestors: ["'none'"],
            formAction: ["'self'"],
            baseUri: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false, // Allow loading external resources
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Additional security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});

// CORS configuration
const corsOptions = {
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.) in development
        if (!origin && !IS_PRODUCTION) {
            return callback(null, true);
        }

        // In production, require origin to be in allowed list
        if (IS_PRODUCTION && ALLOWED_ORIGINS.length === 0) {
            // If no origins configured in production, only allow same-origin
            return callback(null, false);
        }

        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token', 'X-CSRF-Token', 'X-Audit-Repair-Key'],
    maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// CSRF Token generation and validation
const csrfTokens = new Map();
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

function generateCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}

function cleanupCsrfTokens() {
    const now = Date.now();
    for (const [token, data] of csrfTokens.entries()) {
        if (now - data.created > CSRF_TOKEN_EXPIRY) {
            csrfTokens.delete(token);
        }
    }
}
setInterval(cleanupCsrfTokens, 10 * 60 * 1000); // Cleanup every 10 minutes

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
    const token = generateCsrfToken();
    csrfTokens.set(token, { created: Date.now() });
    res.json({ csrfToken: token });
});

// CSRF validation middleware for state-changing operations
const validateCsrf = (req, res, next) => {
    // Skip CSRF for non-browser clients (check for custom header)
    if (req.headers['x-requested-with'] === 'api-client') {
        return next();
    }

    const token = req.headers['x-csrf-token'];
    if (!token || !csrfTokens.has(token)) {
        return res.status(403).json({ error: 'Invalid or missing CSRF token' });
    }

    // Token is valid, remove it (single use)
    csrfTokens.delete(token);
    next();
};

// Apply CSRF to all POST routes except those with their own auth
app.use((req, res, next) => {
    if (req.method === 'POST') {
        // Exempt endpoints that have their own authentication:
        // - /api/lookup: uses edit token auth
        // - /api/admin/*: uses admin token auth
        // - /api/submit: uses edit token for updates
        // - /api/withdraw: uses edit token auth
        const isExempt = req.path === '/api/lookup' ||
                         req.path.startsWith('/api/admin/') ||
                         req.path === '/api/submit' ||
                         req.path === '/api/withdraw';

        if (!isExempt) {
            return validateCsrf(req, res, next);
        }
    }
    next();
});

// Body parsing with reduced limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Apply general rate limiting
app.use(generalLimiter);

// Static file serving
app.use(express.static(BASE_DIR, {
    dotfiles: 'deny',
    index: ['index.html'],
    maxAge: IS_PRODUCTION ? '1d' : 0
}));

// Routes
app.use(publicRoutes);
app.use(adminRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    // Log error details internally
    console.error("Runtime error:", err);
    commitToAudit("SYSTEM_RUNTIME_FAULT", err.message);

    // Don't leak error details to client
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        error: IS_PRODUCTION ? 'Internal server error' : err.message
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════════════════╗
    ║     CC Election Portal - Backend v11.21.0             ║
    ║     Security Hardened Edition                         ║
    ╠═══════════════════════════════════════════════════════╣
    ║  Port: ${String(PORT).padEnd(46)}║
    ║  Environment: ${String(IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT').padEnd(39)}║
    ║  CORS Origins: ${String(ALLOWED_ORIGINS.length || 'same-origin only').padEnd(37)}║
    ║  Started: ${new Date().toUTCString().padEnd(42)}║
    ╚═══════════════════════════════════════════════════════╝
    `);

    if (!IS_PRODUCTION) {
        console.warn('\n⚠️  Running in DEVELOPMENT mode. Set NODE_ENV=production for production deployment.\n');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log("Shutting down gracefully...");
    server.close(() => {
        commitToAudit("SYSTEM_SHUTDOWN_SIGNAL", "Graceful exit.");
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log("Received SIGINT, shutting down...");
    server.close(() => {
        commitToAudit("SYSTEM_SHUTDOWN_SIGNAL", "SIGINT received.");
        process.exit(0);
    });
});

process.on('uncaughtException', (err) => {
    console.error("Uncaught exception:", err);
    commitToAudit("UNCAUGHT_EXCEPTION_CRITICAL", err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error("Unhandled rejection at:", promise, "reason:", reason);
    commitToAudit("UNHANDLED_REJECTION", String(reason));
});

module.exports = app;
