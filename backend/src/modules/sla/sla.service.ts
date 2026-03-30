import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SlaService implements OnModuleInit {
  private readonly logger = new Logger(SlaService.name);
  private redis: any = null;

  async onModuleInit() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      this.logger.warn('UPSTASH_REDIS_REST_URL/TOKEN não configurados — SLA jobs desativados.');
      return;
    }

    try {
      const { Redis } = await import('@upstash/redis');
      this.redis = new Redis({ url, token });
      await this.redis.ping();
      this.logger.log('Upstash Redis conectado — SLA jobs ativos.');
    } catch (e) {
      this.logger.error(`Upstash Redis falhou: ${e.message} — SLA jobs desativados.`);
      this.redis = null;
    }
  }

  async scheduleSlaCheck(
    stepExecutionId: string,
    deadline: Date,
    options: { actionOnTimeout: string; escalateToId?: string },
  ): Promise<string | null> {
    if (!this.redis) return null;

    const ttlSeconds = Math.ceil((deadline.getTime() - Date.now()) / 1000);
    if (ttlSeconds <= 0) return null;

    const key = `sla:${stepExecutionId}`;
    const payload = JSON.stringify({
      stepExecutionId,
      actionOnTimeout: options.actionOnTimeout,
      escalateToId: options.escalateToId,
      deadline: deadline.toISOString(),
    });

    try {
      // Store job data with TTL
      await this.redis.set(key, payload, { ex: ttlSeconds + 3600 });
      // Add to sorted set: score = deadline timestamp
      // @upstash/redis zadd syntax: zadd(key, { score, member })
      await this.redis.zadd('sla:pending', { score: deadline.getTime(), member: stepExecutionId });
      this.logger.debug(`SLA agendado: ${stepExecutionId}`);
      return key;
    } catch (e) {
      this.logger.error(`Falha ao agendar SLA: ${e.message}`);
      return null;
    }
  }

  async cancelSlaCheck(jobId: string): Promise<void> {
    if (!this.redis || !jobId) return;
    try {
      const stepId = jobId.replace('sla:', '');
      await this.redis.del(`sla:${stepId}`);
      await this.redis.zrem('sla:pending', stepId);
    } catch (e) {
      this.logger.warn(`Falha ao cancelar SLA ${jobId}: ${e.message}`);
    }
  }

  async getExpiredJobs(): Promise<string[]> {
    if (!this.redis) return [];
    try {
      const now = Date.now();
      // @upstash/redis: zrange with BYSCORE option (correct API)
      const expired = await this.redis.zrange('sla:pending', 0, now, {
        byScore: true,
        count: 50,
        offset: 0,
      });
      return (expired as string[]) || [];
    } catch (e) {
      this.logger.error(`Erro ao buscar SLAs vencidos: ${e.message}`);
      return [];
    }
  }

  async removeFromPending(stepExecutionId: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.zrem('sla:pending', stepExecutionId);
      await this.redis.del(`sla:${stepExecutionId}`);
    } catch (_) {}
  }
}
