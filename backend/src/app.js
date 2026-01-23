import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import userRoutes from './routes/user.js';
import contentRoutes from './routes/content.js';
import platformsRoutes from './routes/platforms.js';
import paymentsRoutes from './routes/payments.js';
import { User, sequelize } from './models/index.js';

dotenv.config();

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

// JWT authentication middleware
app.use(async (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(auth.slice(7), jwtSecret);
      const user = await User.findByPk(payload.id);
      req.user = user || null;
    } catch (e) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
});

app.use('/api/user', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/platforms', platformsRoutes);
app.use('/api/payments', paymentsRoutes);

const PORT = process.env.PORT || 5000;
async function initServer() {
  try {
    await sequelize.authenticate();
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
    }
  } catch (err) {
    console.error('Database initialization failed:', err);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

initServer();