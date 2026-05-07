# AI Surgical Voice Report - Project Structure

Complete folder and file structure from the beginning.

## Root Level

```
AI_surgical_voice_report/
├── .github/                          # GitHub workflows and docs
├── .git/                             # Git repository
├── .vscode/                          # VS Code settings
├── .gitignore                        # Git ignore rules
├── backend/                          # Node.js Express backend
├── frontend/                         # React frontend
├── README.md                         # Project documentation
└── postgresql-manual.log             # Database logs
```

---

## Backend Structure (`/backend`)

### Purpose
Node.js Express server handling:
- Authentication & JWT tokens
- Knowledge Base (KB) management
- Perplexity API integration for report generation
- Retell AI voice agent integration
- Email notifications via SMTP
- PostgreSQL database operations
- Webhook handling for voice call reports

### Folder & File Breakdown

```
backend/
│
├── .env                              # Runtime environment variables (IGNORED)
├── .env.example                      # Environment template (for documentation)
├── .gitignore                        # Git ignore rules
├── package.json                      # Node dependencies & scripts
├── package-lock.json                 # Locked dependency versions
│
├── index.js                          # ⭐ Express app entry point
│                                     #   - CORS setup
│                                     #   - Port configuration
│                                     #   - Route initialization
│
├── config/
│   ├── db.js                         # PostgreSQL connection setup
│   └── knowledge_base.txt            # KB content file
│
├── middleware/
│   └── auth.js                       # JWT authentication middleware
│
├── routes/
│   ├── auth.js                       # Authentication routes
│   │   - POST /auth/login            # User login
│   │   - POST /auth/signup           # User registration
│   │   - POST /auth/forgot-password  # Password reset request
│   │   - POST /auth/reset-password   # Password reset with token
│   │
│   ├── webhook.js                    # Retell webhook receiver
│   │   - POST /webhook               # Receives voice call data
│   │   - Triggers report generation
│   │
│   └── api/
│       ├── health.js                 # Health check routes
│       │   - GET /health             # Server status
│       │
│       ├── kb.js                     # Knowledge Base routes
│       │   - POST /kb/upload         # Upload & sync KB
│       │   - GET /kb/history         # Get upload history
│       │
│       ├── settings.js               # Settings & Retell routes
│       │   - GET /retell/status      # Check Retell connection
│       │   - POST /retell/connect    # Connect Retell agent
│       │   - POST /retell/disconnect # Disconnect agent
│       │   - GET /retell/agents      # List available agents
│       │
│       └── users.js                  # User profile routes
│           - GET /users/me           # Get current user
│           - PATCH /users/me         # Update phone
│           - POST /users/change-password # Change password
│
├── services/
│   ├── authService.js                # JWT & password management
│   │   - Token generation & validation
│   │   - Password hashing (bcryptjs)
│   │
│   ├── dbService.js                  # Database operations
│   │   - User CRUD operations
│   │   - KB version management
│   │   - Report history queries
│   │
│   ├── emailService.js               # SMTP email sender
│   │   - Nodemailer configuration
│   │   - Report delivery emails
│   │   - Uses SMTP_* env variables
│   │
│   ├── gptService.js                 # Perplexity API integration
│   │   - Report generation using KB
│   │   - Prompt engineering
│   │   - Uses PERPLEXITY_API_KEY env var
│   │
│   └── retellService.js              # Retell AI voice agent
│       - Agent connection management
│       - Uses RETELL_API_KEY & RETELL_BASE_URL env vars
│
├── utils/
│   ├── env.js                        # Environment variable loader
│   ├── fileParser.js                 # KB file parsing utilities
│   └── logger.js                     # Logging helper
│
├── middleware/
│   └── auth.js                       # JWT verification middleware
│
├── reports/                          # Generated reports storage
│   └── report_call_*.{txt,html}      # Voice call transcriptions
│
└── assets/                           # Empty folder (for future use)
```

### Key Environment Variables (backend/.env)

```env
# Server
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# Authentication
AUTH_TOKEN_SECRET=your-secret-key
PASSWORD_RESET_TTL_MINUTES=30

# Perplexity API
PERPLEXITY_API_KEY=your-api-key
PERPLEXITY_API_URL=https://api.perplexity.ai/chat/completions

# Retell AI
RETELL_API_KEY=your-api-key
RETELL_BASE_URL=https://api.retellai.com
RETELL_TIMEOUT_MS=45000

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# CORS & Frontend
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
FRONTEND_URL=http://localhost:3000
```

---

## Frontend Structure (`/frontend`)

### Purpose
React application for:
- User authentication (login, signup, password reset)
- KB upload & management
- Retell AI voice agent settings
- User profile & account management
- Report history viewing

### Folder & File Breakdown

```
frontend/
│
├── .env                              # Runtime environment variables (IGNORED)
├── .env.example                      # Environment template (for documentation)
├── .gitignore                        # Git ignore rules
├── package.json                      # React dependencies & scripts
├── package-lock.json                 # Locked dependency versions
│
├── public/
│   └── index.html                    # HTML entry point
│
├── build/                            # Production build output (IGNORED)
│
├── src/
│   ├── index.js                      # React app bootstrap
│   │   - ReactDOM.render App.jsx
│   │   - root.render into index.html
│   │
│   ├── App.jsx                       # ⭐ Main app component
│   │   - React Router setup
│   │   - Route definitions
│   │   - Layout wrapper
│   │   - Protected routes with token validation
│   │
│   ├── api.js                        # ⭐ Axios HTTP client
│   │   - BASE_URL configuration
│   │   - AUTH headers setup
│   │   - All API functions:
│   │     * Auth: login, signup, forgot-password, reset-password
│   │     * KB: uploadKB, getKBHistory
│   │     * Retell: getRetellStatus, connectRetell, disconnectRetell, getAgents
│   │     * Profile: getProfile, updatePhone, changePassword
│   │   - Token management
│   │   - Response error handling
│   │
│   ├── styles/
│   │   └── app.css                   # Global CSS styles
│   │
│   └── pages/                        # Route components
│       ├── Login.jsx                 # Login page
│       │   - Email & password input
│       │   - Forgot password link
│       │   - Signup redirect
│       │
│       ├── Signup.jsx                # Registration page
│       │   - Email, password, phone inputs
│       │   - Auto-login after signup
│       │
│       ├── ForgotPassword.jsx        # Password reset request
│       │   - Email input
│       │   - Sends reset link
│       │
│       ├── ResetPassword.jsx         # Password reset page
│       │   - Token from URL query param
│       │   - New password input
│       │   - Redirects to login on success
│       │
│       ├── UploadKB.jsx              # Knowledge Base upload
│       │   - File upload form
│       │   - Sync & publish to Retell
│       │   - Recent uploads list
│       │   - Link to full history
│       │
│       ├── KBHistory.jsx             # KB upload history
│       │   - All past uploads
│       │   - Sorting (date, filename, status)
│       │   - Pagination with page size selector
│       │   - Download links
│       │
│       ├── Settings.jsx              # Retell AI settings
│       │   - Connect/disconnect agent
│       │   - Select active agent
│       │   - View agent list
│       │   - Test voice connection
│       │
│       └── Profile.jsx               # User profile & account
│           - View user info
│           - Update phone number
│           - Change password
│           - Logout button
│
└── node_modules/                     # Dependencies (IGNORED)
```

### Key Environment Variables (frontend/.env)

```env
# API Configuration
REACT_APP_API_URL=http://localhost:3001

# API Timeout
REACT_APP_API_TIMEOUT_MS=30000

# Token Storage Key
REACT_APP_TOKEN_STORAGE_KEY=surgical_token
```

---

## Root Level Files

```
.gitignore                # Ignores: node_modules/, .env, reports/, build/, dist/
.github/                  # GitHub Actions workflows & docs
.vscode/                  # VS Code workspace settings
README.md                 # Project documentation
```

---

## Environment Variable Summary

### Development Setup
1. Backend: `backend/.env`
2. Frontend: `frontend/.env`
3. Examples: `backend/.env.example` & `frontend/.env.example`

### Production (Railway Deployment)
- Set all environment variables in Railway dashboard
- Reference: `.env.example` files for complete list
- **Never commit actual `.env` files** (protected by .gitignore)

---

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                           │
│  Login → UploadKB → KBHistory → Settings → Profile           │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   │ HTTP/AXIOS
                   ↓
┌──────────────────────────────────────────────────────────────┐
│              BACKEND (Express + Node.js)                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Routes:                                                       │
│  ├─ /auth/*           → authService → JWT tokens            │
│  ├─ /kb/*             → dbService + fileParser              │
│  ├─ /retell/*         → retellService (Retell API)          │
│  ├─ /users/*          → dbService (PostgreSQL)              │
│  └─ /webhook          → gptService + emailService           │
│                                                               │
│ External APIs:                                              │
│  ├─ Perplexity AI     → Report generation (gptService)     │
│  ├─ Retell AI         → Voice agent management             │
│  ├─ PostgreSQL DB     → User data & KB versions            │
│  └─ SMTP Server       → Email delivery                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Deployment Checklist

- [ ] Backend `.env` configured with all required variables
- [ ] Frontend `.env` configured with API URL
- [ ] PostgreSQL database initialized
- [ ] All API keys (Perplexity, Retell, SMTP) obtained
- [ ] `.env` files NOT committed (check .gitignore)
- [ ] `.env.example` files documenting all variables
- [ ] Backend: `npm install` → `npm start`
- [ ] Frontend: `npm install` → `npm run build` or `npm start`
- [ ] Test all routes with valid credentials
- [ ] CORS origins updated for production domains

---

## Quick Commands

```bash
# Backend
cd backend
npm install
npm start                    # Starts on PORT from .env

# Frontend
cd frontend
npm install
npm start                    # Starts on http://localhost:3000
npm run build                # Production build

# Testing
npm test
npm run build
```

---

## File Sizes & Priority

**Critical Files (Deploy Blockers)**
1. `backend/index.js` - Express app setup
2. `backend/config/db.js` - Database connection
3. `frontend/src/App.jsx` - React routing
4. `frontend/src/api.js` - HTTP client config

**Important Files (Feature Logic)**
1. `backend/services/*` - Business logic
2. `backend/routes/api/*` - Route definitions
3. `frontend/src/pages/*` - UI components
4. `.env` & `.env.example` - Configuration

**Generated/Ignored**
1. `node_modules/` - Dependencies
2. `reports/` - Generated voice reports
3. `build/` - Production build output
4. `package-lock.json` - Dependency lock

---

## Production Notes

1. **Environment Variables**: Set all values in Railway/hosting dashboard
2. **Database**: Use managed PostgreSQL service (Railway, AWS RDS, etc.)
3. **API Keys**: Store securely, rotate regularly
4. **Logs**: Monitor `postgresql-manual.log` for database issues
5. **Reports**: Store in persistent volume or cloud storage
6. **CORS**: Update for production domain
7. **HTTPS**: Enable SSL/TLS in production

---

*Last Updated: May 7, 2026*
*For Railway Deployment Ready*
