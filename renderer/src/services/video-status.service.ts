import Redis from "ioredis";
import type { VideoStatus } from "../types";
import { logger } from "../logger";
import { AppError } from "../utils/error";
import { unlink } from "node:fs/promises";
export class VideoStatusService {
  readonly redis: Redis;
  private readonly PREFIX = "video:status:";

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  }

  private getKey(configId: string) {
    return `${this.PREFIX}${configId}`;
  }

  async getVideoStatus(configId: string): Promise<VideoStatus | null> {
    try {
      const status = await this.redis.get(this.getKey(configId));
      return status ? JSON.parse(status) : null;
    } catch (error) {
      logger.error({ configId, error }, "Error getting video status");
      return null;
    }
  }

  async setVideoStatus(status: VideoStatus) {
    try {
      await this.redis.set(
        this.getKey(status.configId),
        JSON.stringify(status)
      );
    } catch (error) {
      logger.error({ status, error }, "Error setting video status");
      throw new AppError(
        `Error setting video status: ${error}`,
        "SET_VIDEO_STATUS_ERROR",
        500
      );
    }
  }

  async updateLastAccessed(configId: string) {
    try {
      const status = await this.getVideoStatus(configId);
      if (status) {
        status.lastAccessed = Date.now();
        await this.setVideoStatus(status);
      }
    } catch (error) {
      logger.error(
        { configId, error },
        "Error updating video status after updating last access"
      );
    }
  }

  async cleanupOldVideos(maxAge: number) {
    try {
      const keys = await this.redis.keys(`${this.PREFIX}*`);
      const now = Date.now();

      for (const key of keys) {
        const statusStr = await this.redis.get(key);
        if (!statusStr) continue;

        const status: VideoStatus = JSON.parse(statusStr);

        if (status.lastAccessed && now - status.lastAccessed > maxAge) {
          if (status.path) {
            try {
              await unlink(status.path);
              await this.redis.del(key);

              logger.info(
                { configId: status.configId },
                "Cleaned up a video file"
              );
            } catch (error) {
              logger.error(
                {
                  error,
                  configId: status.configId,
                },
                "Failed to remove a video file"
              );
            }
          }
        }
      }
    } catch (error) {
      logger.error({ error }, "Error cleaning up old videos");
    }
  }
}
