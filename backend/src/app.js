import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import userRoutes from './routes/user.js';
import contentRoutes from './routes/content.js';
import platformsRoutes from './routes/platforms.js';

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// JWT authentication middleware
app.use(async (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      req.user = payload;
    } catch (e) {
      req.user = null;
    }
  }
  next();
});

app.use('/api/user', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/platforms', platformsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 