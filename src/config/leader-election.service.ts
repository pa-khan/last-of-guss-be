import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class LeaderElectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LeaderElectionService.name);
  private isLeader = false;
  private readonly leaderKey = 'cluster:leader';
  private readonly leaderTTL = 15;
  private readonly instanceId: string;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(private readonly redisService: RedisService) {
    this.instanceId = `${process.pid}-${Date.now()}-${Math.random()}`;
  }

  async onModuleInit() {
    await this.startLeaderElection();
  }

  async onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.isLeader) {
      await this.resignLeadership();
    }
  }

  private async startLeaderElection(): Promise<void> {
    await this.tryBecomeLeader();

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.heartbeatInterval = setInterval(async () => {
      if (this.isLeader) {
        await this.renewLeadership();
      } else {
        await this.tryBecomeLeader();
      }
    }, 5000);
  }

  private async tryBecomeLeader(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const result = await client.set(
        this.leaderKey,
        this.instanceId,
        'EX',
        this.leaderTTL,
        'NX',
      );

      if (result === 'OK') {
        this.isLeader = true;
        this.logger.log(`Под ${this.instanceId} стал лидером кластера`);
      }
    } catch (error) {
      this.logger.error('Ошибка при попытке стать лидером:', error);
    }
  }

  private async renewLeadership(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const currentLeader = await client.get(this.leaderKey);

      if (currentLeader === this.instanceId) {
        await client.expire(this.leaderKey, this.leaderTTL);
        this.logger.debug(`Лидерство продлено для пода ${this.instanceId}`);
      } else {
        this.isLeader = false;
        this.logger.warn(
          `Под ${this.instanceId} потерял лидерство. Новый лидер: ${currentLeader}`,
        );
      }
    } catch (error) {
      this.logger.error('Ошибка при продлении лидерства:', error);
      this.isLeader = false;
    }
  }

  private async resignLeadership(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      await client.eval(script, 1, this.leaderKey, this.instanceId);
      this.isLeader = false;
      this.logger.log(`Под ${this.instanceId} отказался от лидерства`);
    } catch (error) {
      this.logger.error('Ошибка при отказе от лидерства:', error);
    }
  }

  getIsLeader(): boolean {
    return this.isLeader;
  }

  getInstanceId(): string {
    return this.instanceId;
  }
}
