import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import userRoutes from './routes/user.js';
import contentRoutes from './routes/content.js';
import platformsRoutes from './routes/platforms.js';
import paymentsRoutes from './routes/payments.js';
import { sequelize } from './models/index.js';
import { authenticateToken } from './middleware/auth.js';

// Load environment variables based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
// Try to load environment-specific file first
const envFile = `.env.${nodeEnv}`;
dotenv.config({ path: envFile, override: false });
// Always fallback to .env if specific env file doesn't exist
dotenv.config({ path: '.env', override: false });

const app = express();
const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300
});

app.use(helmet());
app.use(limiter);
app.use(cors({ origin: true, credentials: true }));

// Stripe webhook must be before JSON parsing middleware
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// JWT authentication middleware - attaches user to req.user if token is valid
app.use(authenticateToken);

app.use('/api/user', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/platforms', platformsRoutes);
app.use('/api/payments', paymentsRoutes);

const PORT = process.env.PORT || 5000;
const enableLogging = process.env.ENABLE_LOGGING === 'true';
const logLevel = process.env.LOG_LEVEL || 'info';

async function initServer() {
  try {
    await sequelize.authenticate();
    if (enableLogging && logLevel === 'debug') {
      console.log(`✅ Database connection established (${nodeEnv})`);
    }
    
    // Only sync in non-production environments
    if (nodeEnv !== 'production') {
      await sequelize.sync({ alter: true });
      if (enableLogging && logLevel === 'debug') {
        console.log('✅ Database schema synchronized');
      }
    }
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    const envInfo = nodeEnv === 'production' ? '🚀 PRODUCTION' : nodeEnv === 'test' ? '🧪 TEST' : '🔧 DEVELOPMENT';
    console.log(`${envInfo} Server running on port ${PORT}`);
    if (nodeEnv === 'production') {
      console.log('⚠️  Logging is DISABLED in production');
      console.log('⚠️  SSL is REQUIRED for database connections');
    }
  });
}

initServer();