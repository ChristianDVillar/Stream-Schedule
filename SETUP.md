# Streamer Scheduler - Enhanced Setup Guide

## Overview

This is an enhanced version of the Streamer Scheduler application with the following improvements:

- **Secure OAuth2 Integration**: Encrypted token storage and automatic refresh
- **Multi-Platform Support**: Twitch, Twitter, Instagram, and Discord
- **Advanced Task Management**: Bull Queue with retry logic and logging
- **Enhanced Security**: Rate limiting, CORS, and input validation
- **File Upload Support**: Media uploads for posts and content
- **Comprehensive Logging**: Detailed logs for all operations

## Prerequisites

### Required Software
- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **Redis** (v6.0 or higher)
- **Git**

### Platform Developer Accounts
You'll need developer accounts and API credentials for:
- [Twitch Developer Console](https://dev.twitch.tv/console/apps)
- [Twitter Developer Portal](https://developer.twitter.com/)
- [Facebook Developer Console](https://developers.facebook.com/) (for Instagram)
- [Discord Developer Portal](https://discord.com/developers/applications)

## Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd streamer-scheduler
```

### 2. Backend Setup
```bash
cd backend

# Copy environment file
copy env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm start
```

## Environment Configuration

### Backend (.env file)
Create a `.env` file in the `backend` directory with the following variables:

```env
# Application Configuration
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/streamer-scheduler

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ENCRYPTION_KEY=your-32-character-encryption-key-here

# CORS
CORS_ORIGINS=https://localhost:3000,http://localhost:3000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Platform OAuth Credentials
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
TWITCH_REDIRECT_URI=https://localhost:5000/api/auth/twitch/callback

TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_REDIRECT_URI=https://localhost:5000/api/auth/twitter/callback

INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
INSTAGRAM_REDIRECT_URI=https://localhost:5000/api/auth/instagram/callback

DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://localhost:5000/api/auth/discord/callback
```

## Platform Setup Instructions

### Twitch Setup
1. Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Create a new application
3. Set OAuth Redirect URLs to: `https://localhost:5000/api/auth/twitch/callback`
4. Add required scopes:
   - `channel:read:streams`
   - `channel:manage:streams`
   - `clips:edit`
   - `user:read:email`
5. Copy Client ID and Client Secret to your `.env` file

### Twitter Setup
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Enable OAuth 2.0
4. Set callback URL to: `https://localhost:5000/api/auth/twitter/callback`
5. Add required scopes:
   - `tweet.write`
   - `users.read`
   - `offline.access`
6. Copy Client ID and Client Secret to your `.env` file

### Instagram Setup
1. Go to [Facebook Developer Console](https://developers.facebook.com/)
2. Create a new app
3. Add Instagram Basic Display product
4. Set OAuth Redirect URIs to: `https://localhost:5000/api/auth/instagram/callback`
5. Add required scopes:
   - `instagram_basic`
   - `pages_show_list`
   - `instagram_content_publish`
6. Copy Client ID and Client Secret to your `.env` file

### Discord Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 settings
4. Set redirect URL to: `https://localhost:5000/api/auth/discord/callback`
5. Add required scopes:
   - `bot`
   - `identify`
   - `guilds`
   - `applications.commands`
6. Copy Client ID and Client Secret to your `.env` file

## Database Setup

### MongoDB
1. Install MongoDB locally or use MongoDB Atlas
2. Create a database named `streamer-scheduler`
3. Update `MONGODB_URI` in your `.env` file

### Redis
1. Install Redis locally or use Redis Cloud
2. Start Redis server
3. Update Redis configuration in your `.env` file

## Running the Application

### Development Mode
```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2)
cd frontend
npm start
```

### Production Mode
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/twitch` - Twitch OAuth
- `GET /api/auth/twitter/auth` - Twitter OAuth
- `GET /api/auth/instagram/auth` - Instagram OAuth
- `GET /api/auth/discord/auth` - Discord OAuth
- `GET /api/auth/platforms` - Get connected platforms
- `POST /api/auth/platforms/:platform/disconnect` - Disconnect platform

### Content Management
- `POST /api/content/schedule` - Schedule new content
- `GET /api/content` - Get user's scheduled content
- `GET /api/content/:contentId` - Get specific content
- `PUT /api/content/:contentId` - Update content
- `DELETE /api/content/:contentId` - Cancel content
- `POST /api/content/:contentId/retry` - Retry failed content
- `GET /api/content/stats/queue` - Get queue statistics

### Health Check
- `GET /api/health` - Application health status

## Features

### Enhanced Security
- **Token Encryption**: OAuth tokens are encrypted using AES-256-CBC
- **Rate Limiting**: API endpoints are rate-limited to prevent abuse
- **CORS Protection**: Configured CORS for secure cross-origin requests
- **Input Validation**: Comprehensive validation for all inputs
- **Error Handling**: Detailed error responses with proper HTTP status codes

### Task Management
- **Bull Queue**: Robust job queue with Redis backend
- **Retry Logic**: Automatic retry with exponential backoff
- **Logging**: Detailed logs for all operations
- **Status Tracking**: Real-time status updates for scheduled content

### Multi-Platform Support
- **Unified Interface**: Single interface for all platforms
- **Platform-Specific Features**: Optimized for each platform's capabilities
- **Connection Management**: Easy platform connection/disconnection
- **Token Refresh**: Automatic token renewal

### File Management
- **Media Uploads**: Support for images and videos
- **File Validation**: Type and size validation
- **Secure Storage**: Files stored in uploads directory
- **CDN Ready**: Easy integration with CDN services

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify database permissions

2. **Redis Connection Error**
   - Ensure Redis is running
   - Check Redis configuration in `.env`
   - Verify Redis port is accessible

3. **OAuth Errors**
   - Verify redirect URIs match exactly
   - Check client IDs and secrets
   - Ensure required scopes are added

4. **File Upload Errors**
   - Check uploads directory permissions
   - Verify file size limits
   - Ensure supported file types

### Logs
- Backend logs are available in the console
- Queue logs are stored in Redis
- Content logs are stored in MongoDB

## Development

### Project Structure
```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── types/           # TypeScript types
├── uploads/             # File uploads
└── env.example          # Environment template

frontend/
├── src/
│   ├── components/      # React components
│   ├── contexts/        # React contexts
│   ├── pages/           # Page components
│   └── services/        # API services
```

### Adding New Platforms
1. Create platform service in `backend/src/services/`
2. Add OAuth configuration in `config.ts`
3. Create platform routes in `backend/src/routes/`
4. Update frontend components
5. Add platform-specific UI components

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error details
3. Verify all environment variables are set correctly
4. Ensure all prerequisites are installed and running

## License

This project is licensed under the MIT License. 