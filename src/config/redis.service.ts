import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfiguration } from './configuration';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly lockTTL = 5000;

  constructor(
    private readonly configService: ConfigService<AppConfiguration, true>,
  ) {
    const redisUrl = this.configService.get('redis.url', { infer: true });

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Redis успешно подключен');
    });

    this.client.on('error', (error) => {
      this.logger.error('Ошибка подключения к Redis:', error);
    });

    this.client.on('close', () => {
      this.logger.warn('Соединение с Redis закрыто');
    });
  }

  async acquireLock(
    key: string,
    ttl: number = this.lockTTL,
  ): Promise<string | null> {
    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}-${Math.random()}`;

    try {
      const result = await this.client.set(lockKey, lockValue, 'PX', ttl, 'NX');

      if (result === 'OK') {
        this.logger.debug(`Блокировка получена: ${lockKey}`);
        return lockValue;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Не удалось получить блокировку для ${lockKey}:`,
        error,
      );
      return null;
    }
  }

  async releaseLock(key: string, lockValue: string): Promise<boolean> {
    const lockKey = `lock:${key}`;

    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.client.eval(script, 1, lockKey, lockValue);

      if (result === 1) {
        this.logger.debug(`Блокировка снята: ${lockKey}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Не удалось снять блокировку для ${lockKey}:`, error);
      return false;
    }
  }

  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options: {
      ttl?: number;
      retries?: number;
      retryDelay?: number;
    } = {},
  ): Promise<T> {
    const { ttl = this.lockTTL, retries = 3, retryDelay = 100 } = options;

    let lockValue: string | null = null;
    let attempts = 0;

    while (attempts < retries) {
      lockValue = await this.acquireLock(key, ttl);

      if (lockValue) {
        break;
      }

      attempts++;
      if (attempts < retries) {
        await this.sleep(retryDelay * attempts);
      }
    }

    if (!lockValue) {
      throw new Error(
        `Не удалось получить блокировку для ${key} после ${retries} попыток`,
      );
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(key, lockValue);
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Не удалось получить ключ ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      this.logger.error(`Не удалось установить ключ ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      this.logger.error(`Не удалось удалить ключ ${key}:`, error);
      return false;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error(`Не удалось инкрементировать ключ ${key}:`, error);
      throw error;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.logger.error(`Не удалось установить TTL для ключа ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(
        `Не удалось проверить существование ключа ${key}:`,
        error,
      );
      return false;
    }
  }

  getClient(): Redis {
    return this.client;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async onModuleDestroy() {
    this.logger.log('Закрытие соединения с Redis...');
    await this.client.quit();
  }
}
