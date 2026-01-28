# Constitutional Committee Election Portal

A secure, transparent, and auditable election portal for Constitutional Committee (CC) member registration and management on the Cardano blockchain.

![Portal Version](https://img.shields.io/badge/version-11.4-blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![License](https://img.shields.io/badge/license-Apache%202.0-blue)

## Overview

The CC Election Portal provides a comprehensive platform for managing Constitutional Committee elections, including:

- **Candidate Registration**: Multi-track registration system supporting Individual, Organisation, and Consortium applicants
- **Cold Credential Guides**: Step-by-step wizards for generating Ed25519 keys and multisig scripts
- **Admin Portal**: Secure management interface for election administrators
- **Immutable Audit Trail**: Blockchain-style SHA-256 hash chain for complete transparency
- **Security Hardened**: Built with defense-in-depth security principles

## Features

### Public Portal
- Interactive registration forms with real-time validation
- Candidate directory with search and filtering
- Cold credential generation guides (Individual & Multisig)
- Election timeline and FAQ
- Terms and conditions acceptance

### Admin Portal
- Candidate verification and management
- Form schema architect (dynamic form builder)
- Timeline scheduler
- Team management
- Audit chain viewer with integrity verification
- Secure token-based authentication

### Security Features
- Helmet.js security headers (CSP, HSTS, X-Frame-Options)
- CORS with strict origin validation
- CSRF token protection
- Rate limiting on all endpoints
- Input sanitization (XSS prevention)
- Prototype pollution protection
- Timing-safe token comparison
- Brute-force protection with lockout
- Immutable audit chain with SHA-256 hashing

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/IntersectMBO/cc-election-portal.git
cd cc-election-portal

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env
# Edit .env with your settings

# Start the server
npm start
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Required
NODE_ENV=production
ADMIN_TOKEN=your-secure-admin-token-here

# Optional
PORT=3000
AUDIT_REPAIR_KEY=your-repair-key-here
ALLOWED_ORIGINS=https://yourdomain.com
TOKEN_EXPIRY_DAYS=90
```

> **Important**: Never commit `.env` files to version control. Use `.env.example` as a template.

## Project Structure

```
cc-election-portal/
├── server/
│   ├── index.js              # Express server entry point
│   ├── config.js             # Configuration module
│   ├── middleware/
│   │   ├── auth.js           # Authentication middleware
│   │   └── rateLimiter.js    # Rate limiting rules
│   ├── routes/
│   │   ├── public.js         # Public API endpoints
│   │   └── admin.js          # Admin-only endpoints
│   ├── services/
│   │   ├── audit.js          # SHA-256 audit chain
│   │   └── storage.js        # File persistence
│   └── utils/
│       ├── helpers.js        # Sanitization & validation
│       └── infrastructure.js # Directory initialization
├── public/
│   └── js/
│       ├── admin/            # Admin portal JavaScript
│       └── portal/           # Public portal JavaScript
├── submissions/              # Candidate submissions (gitignored)
├── logs/                     # Audit logs (gitignored)
├── *.html                    # Public HTML pages
├── portal_config.json        # Portal configuration
├── portal_questions.json     # Form schema definitions
├── teams.json                # Team registry
├── timeline.json             # Election timeline
└── package.json
```

## API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/csrf-token` | Get CSRF token |
| GET | `/api/portal-config` | Get portal configuration |
| GET | `/api/candidates` | List all verified candidates |
| GET | `/api/candidates/:id` | Get candidate by ID |
| GET | `/api/questions` | Get form schema |
| GET | `/api/timeline` | Get election timeline |
| GET | `/api/teams` | Get team registry |
| POST | `/api/submit` | Submit new registration |
| POST | `/api/update` | Update existing registration |
| POST | `/api/lookup` | Lookup submission by edit token |

### Admin Endpoints

All admin endpoints require `Authorization: Bearer <ADMIN_TOKEN>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/submissions` | List all submissions |
| POST | `/api/admin/verify/:id` | Verify candidate identity |
| POST | `/api/admin/archive/:id` | Archive submission |
| POST | `/api/admin/restore/:id` | Restore archived submission |
| PUT | `/api/admin/questions` | Update form schema |
| PUT | `/api/admin/timeline` | Update timeline |
| PUT | `/api/admin/teams` | Update teams |
| PUT | `/api/admin/config` | Update portal config |
| GET | `/api/admin/audit-chain` | Get full audit chain |
| POST | `/api/admin/audit/verify` | Verify audit chain integrity |

## Cold Credential Guides

The portal includes comprehensive guides for generating cold credentials:

### Individual Setup
For single CC members using Ed25519 key pairs:
1. Generate cold key pair (offline)
2. Generate hot key pair
3. Create authorization certificate
4. Submit transaction

### Multisig Setup
For organisations/consortiums using simple scripts:
1. Configure team members and thresholds
2. Generate cold keys for each member
3. Create cold script with quorum rules
4. Generate hot keys for operators
5. Create hot script
6. Submit authorization certificate

## Security Considerations

### Production Deployment

1. **Always set `NODE_ENV=production`** - Enables strict security measures
2. **Use strong admin tokens** - Generate cryptographically secure tokens
3. **Configure CORS properly** - Set `ALLOWED_ORIGINS` to your domain(s)
4. **Use HTTPS** - Deploy behind a reverse proxy with TLS
5. **Backup audit chain** - Regularly backup `logs/audit_chain.json`
6. **Monitor rate limits** - Adjust limits based on traffic patterns

### Audit Chain

The portal maintains an immutable audit trail using blockchain-style hashing:
- Every state change is recorded with timestamp, event type, and data snapshot
- Each entry is linked to the previous via SHA-256 hash
- Chain integrity can be verified at any time
- Tampering is detectable and recoverable

## Development

```bash
# Run in development mode
NODE_ENV=development npm start

# Run with nodemon (auto-restart)
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- All Constitutional Committee candidates and voters

## Support

- **Issues**: [GitHub Issues](https://github.com/Thomas-nada/regtool/issues)

---

**Facilitated by Intersect** | Building the future of decentralized governance
