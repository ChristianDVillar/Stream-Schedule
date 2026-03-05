[Español](README.md) · [English](README.en.md)

---

# Streamer Scheduler

A web application to schedule and manage content across multiple social platforms from a single place.

---

## What it does

Streamer Scheduler is a content management platform that allows content creators and streamers to:

- **Schedule posts** across multiple platforms (Twitch, Twitter/X, Instagram, Discord)
- **Manage content** with a visual calendar interface
- **Upload media** (images and videos) with secure storage
- **Multi-language support** (Spanish and English)

---

## Features

### Current features

- ✅ **Multi-platform scheduling** – Schedule content for Twitch, Twitter/X, Instagram, Discord
- ✅ **Visual calendar** – Drag and drop interface for content management
- ✅ **License system** – Trial, Monthly, Quarterly, and Lifetime plans
- ✅ **Admin dashboard** – Complete user and license management
- ✅ **OAuth authentication** – Login with Google and Twitch
- ✅ **Payment integration** – Stripe integration for license purchases
- ✅ **Media uploads** – Secure file uploads with trial/pro limits
- ✅ **Input validation** – Comprehensive validation with Joi schemas
- ✅ **Structured logging** – Winston-based logging system

### Planned features

- 🔄 **Content automation** – Automatic posting to platforms
- 🔄 **Additional platforms** – YouTube, TikTok (schema already supports them)
- 🔄 **Analytics dashboard** – Performance metrics and insights
- 🔄 **Content templates** – Reusable content templates
- 🔄 **Team collaboration** – Multi-user team management
- 🔄 **Advanced scheduling** – Recurring posts and bulk operations
- 🔄 **Content library** – Media library with search and organization
- 🔄 **API access** – RESTful API for third-party integrations

---

## Technology stack

### Backend

- **Node.js** with Express.js
- **PostgreSQL** (Supabase) / SQLite for development
- **Sequelize** ORM for database management
- **JWT** for authentication
- **Stripe** for payment processing
- **Supabase Storage** for media files
- **Winston** for structured logging
- **Joi** for input validation

### Frontend

- **React** 18.2
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Axios** for API communication
- **React Hot Toast** for notifications
- **Lucide React** for icons
- **Supabase JS** for storage operations

---

## Security features

- 🔒 **Secure password generation** – Uses crypto.randomBytes for all tokens and keys
- **Input validation** – Prevents XSS and injection attacks
- **SQL injection protection** – Parameterized queries throughout
- **JWT authentication** – Secure token-based authentication
- **Rate limiting** – Protection against brute force attacks
- **Structured logging** – Security event logging

---

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (or SQLite for development)
- Supabase account (for storage)
- Stripe account (for payments)

### Backend setup

```bash
cd backend
npm install
cp env.example .env
# Edit .env with your configuration
npm start
```

### Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your API URL
npm start
```

---

## Environment variables

### Backend

See `backend/env.example` for all required variables.

### Frontend

- `REACT_APP_API_URL` – Backend API URL
- `REACT_APP_SUPABASE_URL` – Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` – Supabase anonymous key

### OAuth: "redirect_uri invalid"

If you see **redirect_uri de OAuth2 no válido** (or "redirect_uri invalid"), the redirect URI in the request does not match what is configured in the provider. Add the **exact** same URLs in each dashboard:

- **Supabase** (Google/Twitch from frontend): **Authentication** → **URL Configuration** → **Redirect URLs** and **Site URL**. Add `http://localhost:3000/auth/callback` (local) and your production URL + `/auth/callback`.
- **Discord**: **Developer Portal** → Your application → **OAuth2** → **Redirects**. Add **both**:  
  `http://localhost:5000/api/user/auth/discord/callback` and  
  `http://localhost:5000/api/user/auth/discord/link/callback`  
  (and the same with your `BACKEND_URL` in production).

Full list of redirect URIs per provider: see comments in **`backend/env.example`** (section "OAUTH2 REDIRECT URIs").

**Note:** Console messages when opening Discord's page (e.g. "AnalyticsTrackImpressionContext", "Wait! If someone told you...") come from **discord.com**, not from this app; they cannot be removed from here.

### Production: OAuth (Google / Twitch) on Render

To avoid redirecting to localhost after Google or Twitch login:

1. **Supabase Dashboard** → Your project → **Authentication** → **URL Configuration**
   - Set **Site URL** to your production frontend URL (e.g. `https://stream-schedule-v1.onrender.com`)
   - Under **Redirect URLs**, add: `https://your-frontend-domain.onrender.com/auth/callback` (and keep `http://localhost:3000/auth/callback` for local dev)
2. The app uses the current page origin for the OAuth redirect, so `REACT_APP_FRONTEND_URL` is not required for OAuth when deployed.

**Publishing to Discord (scheduled events and messages):** Connecting Discord in Settings uses OAuth (`DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`). For the backend to **publish** to your servers (scheduled events, messages, etc.), you also need the **bot token**:

- **Render** → backend service (API) → **Environment**. Add:
  - **DISCORD_BOT_TOKEN**: your Discord application bot token.
- **Discord Developer Portal** → [discord.com/developers](https://discord.com/developers/applications) → your application → **Bot** → **Reset Token** / **View Token**. Copy the token and set it as `DISCORD_BOT_TOKEN` in Render. Do not share it or commit it to the repo.
- Save the variables and **redeploy** the backend.

If `DISCORD_BOT_TOKEN` is not set in production, scheduled Discord publications will show "Discord bot not configured" (content will be marked as failed or retrying).

---

## License

Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited.

See `LICENSE` file for details.

---

## Documentation

Full index: **[docs/README.md](docs/README.md)** (legal protection, terms, and SQL scripts).

Documentation in the repo root:

| File | Description |
|------|-------------|
| [COPYRIGHT_NOTICE.md](COPYRIGHT_NOTICE.md) | Copyright notice and contact. |
| [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md) | Terms of service (EN/ES). |
| [LEGAL_PROTECTION.md](LEGAL_PROTECTION.md) | Legal protection guide. |
| [PROTECTION_SUMMARY.md](PROTECTION_SUMMARY.md) | Summary of protections implemented. |
| [PROTECTION_CHECKLIST.md](PROTECTION_CHECKLIST.md) | Pre-deployment checklist. |

SQL scripts for Supabase (run in the project SQL Editor):

- `SUPABASE_RLS_ALL_TABLES.sql` – Enable RLS on public tables.
- `SUPABASE_STORAGE_POLICIES.sql` – Storage bucket policies.

---

## Support

For issues, questions, or support, please contact the development team.

---

**Version:** 2.1.0  
**Last updated:** January 2026
