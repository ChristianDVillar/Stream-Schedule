import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { Sequelize, DataTypes } from 'sequelize';

const databaseUrl = process.env.DATABASE_URL;
const usePostgres = Boolean(databaseUrl);

const sequelize = usePostgres
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: false,
      protocol: 'postgres',
      ssl: process.env.DATABASE_SSL === 'true',
      dialectOptions: {
        ssl: process.env.DATABASE_SSL === 'true'
          ? { require: true, rejectUnauthorized: false }
          : false,
      },
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: process.env.SQLITE_STORAGE || path.resolve(process.cwd(), 'database.sqlite'),
      logging: false,
    });

// 👤 User
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: { isEmail: true }
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  licenseKey: {
    type: DataTypes.STRING,
    allowNull: true
  },
  licenseType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'none'
  },
  licenseExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  merchandisingLink: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

// 📝 Content
const Content = sequelize.define('Content', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  contentType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['post', 'stream', 'event', 'reel']]
    }
  },
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: false
  },
  hashtags: {
    type: DataTypes.STRING
  },
  mentions: {
    type: DataTypes.STRING
  },
  platforms: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  timezone: {
    type: DataTypes.STRING
  },
  recurrence: {
    type: DataTypes.JSONB
  },
  files: {
    type: DataTypes.JSONB
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'scheduled',
    validate: {
      isIn: [['scheduled', 'published', 'failed', 'canceled']]
    }
  }
});

// 🌐 Platform
const Platform = sequelize.define('Platform', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  platform: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['twitch', 'twitter', 'instagram', 'discord']]
    }
  },
  accessToken: {
    type: DataTypes.STRING,
    allowNull: false
  },
  refreshToken: {
    type: DataTypes.STRING
  },
  expiresAt: {
    type: DataTypes.DATE
  },
  extra: {
    type: DataTypes.JSONB
  }
});

// 💳 Payment
const Payment = sequelize.define('Payment', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  licenseType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'USD'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  provider: {
    type: DataTypes.STRING,
    defaultValue: 'stripe'
  },
  reference: {
    type: DataTypes.STRING
  },
  stripeSessionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripePaymentIntentId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripeCustomerId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paidAt: {
    type: DataTypes.DATE
  }
});

// 📁 Media
const Media = sequelize.define('Media', {
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  size: {
    type: DataTypes.INTEGER, // bytes
    allowNull: false
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false // URL en Supabase Storage o CDN
  },
  storagePath: {
    type: DataTypes.STRING,
    allowNull: false // Ruta en Supabase Storage
  },
  thumbnailUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true // width, height, duration, etc.
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

// 🔗 ContentMedia (Many-to-Many relationship)
const ContentMedia = sequelize.define('ContentMedia', {
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0 // Para ordenar media en un contenido
  }
});

// 🔗 Relaciones
User.hasMany(Content, { foreignKey: 'userId', onDelete: 'CASCADE' });
Content.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Platform, { foreignKey: 'userId', onDelete: 'CASCADE' });
Platform.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Payment, { foreignKey: 'userId', onDelete: 'CASCADE' });
Payment.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Media, { foreignKey: 'userId', onDelete: 'CASCADE' });
Media.belongsTo(User, { foreignKey: 'userId' });

// Many-to-Many: Content <-> Media
Content.belongsToMany(Media, { 
  through: ContentMedia, 
  foreignKey: 'contentId',
  otherKey: 'mediaId',
  onDelete: 'CASCADE'
});
Media.belongsToMany(Content, { 
  through: ContentMedia, 
  foreignKey: 'mediaId',
  otherKey: 'contentId',
  onDelete: 'CASCADE'
});

export { sequelize, User, Content, Platform, Payment, Media, ContentMedia };