import express, { Request, Response, Router } from 'express';
import { User } from '../models/User';
import { TwitchService } from '../services/TwitchService';
import { TwitterService } from '../services/TwitterService';
import { InstagramService } from '../services/InstagramService';
import { DiscordService } from '../services/DiscordService';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { config } from '../config/config';

const router: Router = express.Router();
const twitchService = TwitchService.getInstance();
const twitterService = TwitterService.getInstance();
const instagramService = InstagramService.getInstance();
const discordService = DiscordService.getInstance();

// Register new user
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }]
    });
    if (existingUser) {
      res.status(400).json({ 
        message: existingUser.email === email ? 
          'Email already registered' : 
          'Username already taken'
      });
      return;
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      platformConnections: []
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Error registering user',
        error: error.message 
      });
    } else {
      res.status(500).json({ message: 'Error registering user' });
    }
  }
});

// Login user
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Initiate Twitch OAuth
router.get('/twitch',
  passport.authenticate('twitch')
);

// Twitch OAuth callback
router.get('/twitch/callback',
  passport.authenticate('twitch', {
    failureRedirect: 'https://localhost:3000/login',
    successRedirect: 'https://localhost:3000/dashboard'
  })
);

// Get Twitter auth URL
router.get('/twitter/auth', (req: Request, res: Response): void => {
  const authUrl = twitterService.getAuthUrl();
  res.json({ authUrl });
});

// Twitter OAuth callback
router.get('/twitter/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state } = req.query;
    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      res.status(400).json({ message: 'Invalid OAuth parameters' });
      return;
    }

    const userId = (req as any).user?.userId; // From auth middleware
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { access_token, refresh_token } = await twitterService.getAccessToken(code, state);
    const userInfo = await twitterService.getUserInfo(access_token);

    // Update user's Twitter connection
    await User.findByIdAndUpdate(userId, {
      $set: {
        'platformConnections.twitter': {
          connected: true,
          accessToken: access_token,
          refreshToken: refresh_token,
          username: userInfo.username,
          displayName: userInfo.name,
          profileImage: userInfo.profile_image_url_https,
        },
      },
    });

    res.json({ message: 'Twitter connected successfully' });
  } catch (error) {
    console.error('Twitter callback error:', error);
    res.status(500).json({ message: 'Error connecting to Twitter' });
  }
});

// Get Instagram auth URL
router.get('/instagram/auth', (req: Request, res: Response): void => {
  const authUrl = instagramService.getAuthUrl();
  res.json({ authUrl });
});

// Instagram OAuth callback
router.get('/instagram/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ message: 'Invalid authorization code' });
      return;
    }

    const userId = (req as any).user?.userId; // From auth middleware
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { access_token, user_id } = await instagramService.getAccessToken(code);
    const userInfo = await instagramService.getUserInfo(access_token);

    // Update user's Instagram connection
    await User.findByIdAndUpdate(userId, {
      $set: {
        'platformConnections.instagram': {
          connected: true,
          accessToken: access_token,
          userId: user_id,
          username: userInfo.username,
          displayName: userInfo.username,
          profileImage: `https://graph.instagram.com/${user_id}/picture`,
        },
      },
    });

    res.json({ message: 'Instagram connected successfully' });
  } catch (error) {
    console.error('Instagram callback error:', error);
    res.status(500).json({ message: 'Error connecting to Instagram' });
  }
});

// Get Discord auth URL
router.get('/discord/auth', (req: Request, res: Response): void => {
  const authUrl = discordService.getAuthUrl();
  res.json({ authUrl });
});

// Discord OAuth callback
router.get('/discord/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ message: 'Invalid authorization code' });
      return;
    }

    const userId = (req as any).user?.userId; // From auth middleware
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { access_token, refresh_token, expires_in } = await discordService.getAccessToken(code);
    const userInfo = await discordService.getUserInfo(access_token);

    // Update user's Discord connection
    await User.findByIdAndUpdate(userId, {
      $set: {
        'platformConnections.discord': {
          connected: true,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + expires_in * 1000),
          username: userInfo.username,
          displayName: userInfo.global_name || userInfo.username,
          profileImage: `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png`,
        },
      },
    });

    res.json({ message: 'Discord connected successfully' });
  } catch (error) {
    console.error('Discord callback error:', error);
    res.status(500).json({ message: 'Error connecting to Discord' });
  }
});

// Get connected platforms
router.get('/platforms', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user.platformConnections);
  } catch (error) {
    console.error('Get platforms error:', error);
    res.status(500).json({ message: 'Error getting platform connections' });
  }
});

// Disconnect platform
router.post('/platforms/:platform/disconnect', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { platform } = req.params;

    const update = {
      [`platformConnections.${platform}`]: {
        connected: false,
        accessToken: null,
        refreshToken: null,
        username: null,
        displayName: null,
        profileImage: null,
      },
    };

    await User.findByIdAndUpdate(userId, { $set: update });
    res.json({ message: `${platform} disconnected successfully` });
  } catch (error) {
    console.error('Disconnect platform error:', error);
    res.status(500).json({ message: 'Error disconnecting platform' });
  }
});

// Get current user
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Logout route
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('https://localhost:3000/login');
  });
});

export default router; 