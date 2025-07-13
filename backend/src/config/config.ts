import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/streamer-scheduler',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  
  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: '24h',
    bcryptRounds: 12,
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['https://localhost:3000'],
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },
  
  // Encryption Configuration
  encryption: {
    algorithm: 'aes-256-gcm',
    secretKey: process.env.ENCRYPTION_KEY || 'your-encryption-key-32-chars-long!',
    ivLength: 16,
    tagLength: 16
  },
  
  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },
  
  // Platform OAuth Configurations
  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID || 't6yrdilx0w1o108e6triw82bgybrqx',
    clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
    redirectUri: process.env.TWITCH_REDIRECT_URI || 'https://localhost:5000/api/auth/twitch/callback',
    scopes: [
      'channel:read:streams',
      'channel:manage:streams',
      'clips:edit',
      'user:read:email',
      'channel:read:subscriptions'
    ]
  },
  
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || '',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    redirectUri: process.env.TWITTER_REDIRECT_URI || 'https://localhost:5000/api/auth/twitter/callback',
    scopes: ['tweet.write', 'users.read', 'offline.access']
  },
  
  instagram: {
    clientId: process.env.INSTAGRAM_CLIENT_ID || '',
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI || 'https://localhost:5000/api/auth/instagram/callback',
    scopes: ['instagram_basic', 'pages_show_list', 'instagram_content_publish']
  },
  
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri: process.env.DISCORD_REDIRECT_URI || 'https://localhost:5000/api/auth/discord/callback',
    scopes: ['bot', 'identify', 'guilds', 'applications.commands']
  }
}; 