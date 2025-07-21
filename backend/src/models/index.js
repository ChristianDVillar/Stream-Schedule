import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  protocol: 'postgres',
  ssl: process.env.DATABASE_SSL === 'true',
  dialectOptions: {
    ssl: process.env.DATABASE_SSL === 'true'
      ? { require: true, rejectUnauthorized: false }
      : false,
  },
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
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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

// 🔗 Relaciones
User.hasMany(Content, { foreignKey: 'userId', onDelete: 'CASCADE' });
Content.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Platform, { foreignKey: 'userId', onDelete: 'CASCADE' });
Platform.belongsTo(User, { foreignKey: 'userId' });

export { sequelize, User, Content, Platform }; 