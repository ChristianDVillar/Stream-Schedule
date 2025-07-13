import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import { Strategy as TwitchStrategy } from 'passport-twitch';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import { connectDB } from './config/database';
import { User } from './models/User';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: 'https://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'none'
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(new TwitchStrategy({
    clientID: process.env.TWITCH_CLIENT_ID || '',
    clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
    callbackURL: 'https://localhost:5000/api/auth/twitch/callback',
    scope: 'user:read:email'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Find or create user
      const [user, created] = await User.findOrCreate({
        where: { twitchId: profile.id },
        defaults: {
          username: profile.username,
          displayName: profile.displayName,
          email: profile.email,
          profileImageUrl: profile._json.profile_image_url,
          accessToken,
          refreshToken
        }
      });

      // Update tokens if user exists
      if (!created) {
        await user.update({
          accessToken,
          refreshToken,
          username: profile.username,
          displayName: profile.displayName,
          email: profile.email,
          profileImageUrl: profile._json.profile_image_url
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }
));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Connect to database
connectDB();

// SSL certificate paths
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '../../certificates/localhost.key')),
  cert: fs.readFileSync(path.join(__dirname, '../../certificates/localhost.crt'))
};

// Create HTTPS server
const PORT = process.env.PORT || 5000;
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Server running on https://localhost:${PORT}`);
}); 