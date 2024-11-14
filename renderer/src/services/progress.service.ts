import { Redis } from "ioredis";
import { logger } from "../logger";
import type { ProgressData } from "../types";

export class ProgressService {
  private readonly redis: Redis;
  private readonly prefix = "progress:";
  private readonly channelPrefix = "progress:channel:";

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
    this.redis.on("error", (err) => {
      logger.error({ error: err }, "redis connection error");
    });
  }

  private getProgressKey(configId: string): string {
    return `${this.prefix}${configId}`;
  }

  private getChannelName(configId: string): string {
    return `${this.channelPrefix}${configId}`;
  }

  async publishProgress(configId: string, data: ProgressData): Promise<void> {
    try {
      const channel = this.getChannelName(configId);
      const key = this.getProgressKey(configId);

      await this.redis.set(key, JSON.stringify(data), "EX", 3600);
      await this.redis.publish(channel, JSON.stringify(data));

      logger.debug({ configId, data }, "Progress published");
    } catch (error) {
      logger.error({ configId, error }, "Progress publish error");
      throw error;
    }
  }

  async *subscribeToProgressUpdates(
    configId: string
  ): AsyncGenerator<ProgressData> {
    const subscriber = new Redis(
      process.env.REDIS_URL || "redis://localhost:6379"
    );
    const channel = this.getChannelName(configId);

    try {
      await subscriber.subscribe(channel);
      logger.debug({ configId }, "Subscribed to progress channel");

      const current = await this.redis.get(this.getProgressKey(configId));
      if (current) {
        yield JSON.parse(current);
      }

      while (true) {
        const message = await new Promise<string>((resolve, reject) => {
          subscriber.on("message", (_channel, message) => {
            if (_channel === channel) {
              resolve(message);
            }
          });

          subscriber.on("error", (error) => {
            reject(error);
          });
        });

        yield JSON.parse(message);
      }
    } catch (error) {
      logger.error({ configId, error }, "Subscribe to progress updates error");
      throw error;
    } finally {
      try {
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
        logger.debug({ configId }, "Cleaned up subscriber connection");
      } catch (cleanupError) {
        logger.error(
          { configId, error: cleanupError },
          "Error cleaning up subscriber"
        );
      }
    }
  }

  async cleanup(configId: string) {
    try {
      await this.redis.del(this.getProgressKey(configId));
      logger.debug({ configId }, "Cleaned up progress data");
    } catch (error) {
      logger.error({ error, configId }, "Failed to cleanup progress");
      throw error;
    }
  }
}
