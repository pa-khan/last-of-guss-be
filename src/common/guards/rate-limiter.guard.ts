import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../config/redis.service';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  points: number;
  duration: number;
  blockDuration?: number;
}

export const RateLimit = (options: RateLimitOptions) => {
  return (
    target: any,
    _propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    if (descriptor) {
      Reflect.defineMetadata(RATE_LIMIT_KEY, options, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(RATE_LIMIT_KEY, options, target);
    return target;
  };
};

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly logger = new Logger(RateLimiterGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      handler,
    );

    if (!rateLimitOptions) {
      return true;
    }

    const userId = request.user?.id || request.ip;
    if (!userId) {
      this.logger.warn('Не удалось идентифицировать пользователя');
      return true;
    }

    const key = `rate_limit:${handler.name}:${userId}`;

    try {
      const isAllowed = await this.checkRateLimit(key, rateLimitOptions);

      if (!isAllowed) {
        const blockKey = `${key}:blocked`;
        const isBlocked = await this.redisService.exists(blockKey);

        if (isBlocked) {
          const ttl = await this.getTTL(blockKey);
          this.logger.warn(
            `Превышен лимит запросов для пользователя ${userId} на ${handler.name}. Заблокирован на ${ttl}с`,
          );

          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: `Слишком много запросов. Попробуйте снова через ${ttl} секунд.`,
              error: 'Rate Limit Exceeded',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        if (rateLimitOptions.blockDuration) {
          await this.redisService.set(
            blockKey,
            '1',
            rateLimitOptions.blockDuration,
          );
        }

        this.logger.warn(
          `Превышен лимит запросов для пользователя ${userId} на ${handler.name}`,
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Слишком много запросов. Пожалуйста, замедлитесь.',
            error: 'Rate Limit Exceeded',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Ошибка rate limiter:', error);
      return true;
    }
  }

  private async checkRateLimit(
    key: string,
    options: RateLimitOptions,
  ): Promise<boolean> {
    const current = await this.redisService.incr(key);

    if (current === 1) {
      await this.redisService.expire(key, options.duration);
    }

    return current <= options.points;
  }

  private async getTTL(key: string): Promise<number> {
    const client = this.redisService.getClient();
    const ttl = await client.ttl(key);
    return ttl > 0 ? ttl : 0;
  }
}
