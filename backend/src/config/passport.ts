import passport from 'passport';
import { Strategy as TwitchStrategy } from 'passport-twitch';
import { User } from '../models/User';
import { config } from './config';
import { FaInstagram, FaDiscord, FaTwitter, FaTwitch } from 'react-icons/fa';

passport.use(new TwitchStrategy({
    clientID: config.twitch.clientId,
    clientSecret: config.twitch.clientSecret,
    callbackURL: "http://localhost:5000/api/auth/twitch/callback",
    scope: "user:read:email"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists
      let user = await User.findOne({ 'platformConnections.platformUserId': profile.id });

      if (!user) {
        // Create new user
        user = await User.create({
          username: profile.displayName,
          email: profile.email,
          password: Math.random().toString(36).slice(-8), // Generate random password
          platformConnections: [{
            platform: 'twitch',
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            platformUserId: profile.id,
            username: profile.displayName,
            isConnected: true
          }]
        });
      } else {
        // Update existing user's Twitch connection
        const twitchConnection = user.platformConnections.find(
          conn => conn.platform === 'twitch'
        );

        if (twitchConnection) {
          twitchConnection.accessToken = accessToken;
          twitchConnection.refreshToken = refreshToken;
          twitchConnection.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
          twitchConnection.isConnected = true;
        } else {
          user.platformConnections.push({
            platform: 'twitch',
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            platformUserId: profile.id,
            username: profile.displayName,
            isConnected: true
          });
        }

        await user.save();
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
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
}); 