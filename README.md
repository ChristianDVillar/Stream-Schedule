# Streamer Scheduler Web

A comprehensive web platform for streamers to link social media accounts, schedule content, and automate cross-platform publishing.

## 🚀 Features

### Core Functionality
- **OAuth2 Authentication** for all supported platforms
- **Multi-platform Content Scheduling** (Twitch, Twitter/X, Instagram Business, Discord)
- **Visual Calendar Interface** for content management
- **Admin Panel** with system monitoring and logs
- **Task Queue Management** with Bull queue
- **Token Encryption** for secure credential storage

### Platform Support
- **Twitch**: Stream scheduling, clip promotion
- **Twitter/X**: Tweet scheduling, thread creation
- **Instagram Business**: Post scheduling, reels, stories
- **Discord**: Message scheduling, channel management

### Admin Features
- **Visual Calendar View**: See all scheduled content in a monthly/weekly view
- **System Logs**: Monitor content publishing status and errors
- **Queue Statistics**: Real-time queue monitoring
- **Failed Content Management**: Retry failed publications
- **System Health Monitoring**: Overall system status

## 🛠️ Tech Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** framework
- **MongoDB** with Mongoose ODM
- **Bull Queue** for task management
- **Passport.js** for OAuth2 authentication
- **JWT** for session management

### Frontend
- **React** with TypeScript
- **Material-UI** for modern UI components
- **React Router** for navigation
- **Axios** for API communication
- **Date-fns** for date manipulation

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- Redis (for Bull queue)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd streamer-scheduler-web
   ```

2. **Install dependencies**
   ```bash
   # Windows
   install-dependencies.bat
   
   # Or manually
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Configure environment**
   ```bash
   # Copy backend environment file
   cd backend
   copy env.example .env
   # Edit .env with your configuration
   ```

4. **Start the application**
   ```bash
   # Windows
   start-application.bat
   
   # Or manually
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend
   cd frontend && npm start
   ```

## 🔧 Configuration

### Backend Environment Variables
```env
# Server
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/streamer-scheduler-web

# Redis (for Bull queue)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret

# OAuth2 Credentials
TWITCH_CLIENT_ID=your-twitch-client-id
TWITCH_CLIENT_SECRET=your-twitch-client-secret
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
INSTAGRAM_CLIENT_ID=your-instagram-client-id
INSTAGRAM_CLIENT_SECRET=your-instagram-client-secret
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key
```

## 📱 Usage

### User Dashboard
1. **Login** with your preferred platform
2. **Connect social media accounts** via OAuth2
3. **Schedule content** for multiple platforms
4. **Monitor publishing status** in real-time

### Admin Panel
1. **Access admin panel** from the dashboard
2. **Calendar View**: Visual overview of all scheduled content
3. **System Logs**: Monitor publishing status and errors
4. **Queue Management**: View and manage task queue
5. **Failed Content**: Retry failed publications

### Calendar Features
- **Monthly/Weekly View**: Toggle between calendar views
- **Content Filtering**: Filter by platform, status, or date range
- **Quick Actions**: View, edit, or retry content directly from calendar
- **Visual Indicators**: Color-coded platforms and status

## 🔒 Security Features

- **Token Encryption**: All OAuth tokens encrypted with AES-256-CBC
- **JWT Authentication**: Secure session management
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configured CORS for security
- **Input Validation**: Comprehensive input validation and sanitization

## 📊 Monitoring & Logs

### Admin Logs Panel
- **Content Publishing Logs**: Track all content publishing attempts
- **Error Monitoring**: View failed publications with error details
- **Queue Statistics**: Monitor Bull queue performance
- **System Health**: Overall system status and metrics

### Queue Management
- **Real-time Statistics**: Active, waiting, completed, and failed jobs
- **Retry Mechanism**: Automatic retry for failed publications
- **Manual Retry**: Admin can manually retry failed content

## 🚀 Deployment

### Production Setup
1. **Environment Configuration**: Set production environment variables
2. **Database Setup**: Configure production MongoDB instance
3. **Redis Setup**: Configure production Redis instance
4. **SSL Certificate**: Configure SSL for secure connections
5. **Process Management**: Use PM2 or similar for process management

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation in the `/docs` folder
- Review the architecture documentation

## 🔄 Changelog

### v1.0.0 (Current)
- ✅ OAuth2 authentication for all platforms
- ✅ Visual calendar interface
- ✅ Admin panel with monitoring
- ✅ Task queue management
- ✅ Token encryption
- ✅ Multi-platform content scheduling
- ✅ Code optimization and redundancy removal

### Planned Features
- 📅 Advanced calendar features (recurring content)
- 📊 Analytics dashboard
- 🔔 Notification system
- 📱 Mobile app
- 🤖 AI-powered content suggestions