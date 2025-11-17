export interface AppConfiguration {
  port: number;
  nodeEnv: string;
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  round: {
    duration: number;
    cooldownDuration: number;
  };
  cors: {
    origin: string;
  };
}

export default (): AppConfiguration => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  round: {
    duration: parseInt(process.env.ROUND_DURATION || '60', 10),
    cooldownDuration: parseInt(process.env.COOLDOWN_DURATION || '30', 10),
  },
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
});
