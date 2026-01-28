import dotenv from 'dotenv';

// Load environment variables
// For local development: loads from .env file
// For Render/production: uses Environment Variables from Render dashboard
dotenv.config();

import path from 'path';
import { Sequelize, DataTypes } from 'sequelize';
import { LICENSE_TYPES, LICENSE_TYPE_VALUES } from '../constants/licenseTypes.js';
import { CONTENT_STATUS, CONTENT_STATUS_VALUES } from '../constants/contentStatus.js';
import { CONTENT_TYPES, CONTENT_TYPE_VALUES } from '../constants/contentTypes.js';
import { PLATFORMS, PLATFORM_VALUES } from '../constants/platforms.js';
import { PAYMENT_STATUS, PAYMENT_STATUS_VALUES } from '../constants/paymentStatus.js';

const databaseUrl = process.env.DATABASE_URL;
const usePostgres = Boolean(databaseUrl);
const nodeEnv = process.env.NODE_ENV || 'development';
const enableLogging = process.env.ENABLE_LOGGING === 'true';
const isProduction = nodeEnv === 'production';
const requireSSL = isProduction || process.env.DATABASE_SSL === 'true';

// In production, DATABASE_URL and SSL are required
if (isProduction && !databaseUrl) {
  throw new Error('DATABASE_URL is required in production environment');
}

if (isProduction && !requireSSL) {
  throw new Error('DATABASE_SSL=true is required in production environment');
}

const sequelize = usePostgres
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: enableLogging ? console.log : false,
      protocol: 'postgres',
      dialectOptions: {
        ssl: requireSSL
          ? {
              require: true,
              rejectUnauthorized: false, // Supabase uses self-signed certificates
            }
          : false,
        // Supabase pooler compatibility
        ...(databaseUrl.includes('pooler.supabase.com') && {
          application_name: 'streamer-scheduler',
        }),
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: process.env.SQLITE_STORAGE || path.resolve(process.cwd(), 'database.sqlite'),
      logging: enableLogging ? console.log : false,
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
    allowNull: true // Allow null for OAuth users
  },
  oauthProvider: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: [['google', 'twitch', null]]
    }
  },
  oauthId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  licenseKey: {
    type: DataTypes.STRING,
    allowNull: true
  },
  licenseType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: LICENSE_TYPES.NONE,
    validate: {
      isIn: [LICENSE_TYPE_VALUES]
    }
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
  },
  hasUsedTrial: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  trialExtensions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of times the trial has been extended (max 2)'
  },
  lastPasswordChange: {
    type: DataTypes.DATE,
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
      isIn: [CONTENT_TYPE_VALUES]
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
    defaultValue: CONTENT_STATUS.SCHEDULED,
    validate: {
      isIn: [CONTENT_STATUS_VALUES]
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
      isIn: [PLATFORM_VALUES]
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
    defaultValue: PAYMENT_STATUS.PENDING,
    validate: {
      isIn: [PAYMENT_STATUS_VALUES]
    }
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

// ⚙️ System Configuration
const SystemConfig = sequelize.define('SystemConfig', {
  key: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    primaryKey: true
  },
  value: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

export { sequelize, User, Content, Platform, Payment, Media, ContentMedia, SystemConfig };