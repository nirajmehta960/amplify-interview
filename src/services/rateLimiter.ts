/**
 * Rate Limiter Service
 * Client-side rate limiting for API calls to prevent hitting quotas
 */

export interface RateLimiterConfig {
  requestsPerMinute: number;
  burstLimit?: number;
  queueTimeoutMs?: number;
}

export class RateLimiter {
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timestamp: number;
  }> = [];

  private processing = false;
  private lastRequestTime = 0;
  private requestCount = 0;
  private windowStartTime = Date.now();

  private config: RateLimiterConfig;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = {
      requestsPerMinute: config.requestsPerMinute || 20,
      burstLimit: config.burstLimit || 5,
      queueTimeoutMs: config.queueTimeoutMs || 300000, // 5 minutes
    };
  }

  /**
   * Add a function to the rate-limited queue
   */
  public async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();

      // Check if queue is too old (timeout)
      if (this.queue.length > 0) {
        const oldestRequest = this.queue[0];
        if (timestamp - oldestRequest.timestamp > this.config.queueTimeoutMs!) {
          oldestRequest.reject(new Error("Rate limiter queue timeout"));
          this.queue.shift();
        }
      }

      this.queue.push({
        fn,
        resolve,
        reject,
        timestamp,
      });

      console.log(
        `Rate limiter: Queued request (${this.queue.length} in queue)`
      );
      this.process();
    });
  }

  /**
   * Process the queue with rate limiting
   */
  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    console.log("Rate limiter: Starting queue processing");

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;

      try {
        // Check if we need to wait (rate limiting)
        await this.waitIfNeeded();

        // Execute the request
        console.log("Rate limiter: Executing request");
        const result = await request.fn();
        request.resolve(result);

        // Update counters
        this.requestCount++;
        this.lastRequestTime = Date.now();
      } catch (error) {
        console.error("Rate limiter: Request failed:", error);
        request.reject(error);
      }
    }

    this.processing = false;
    console.log("Rate limiter: Queue processing completed");
  }

  /**
   * Wait if rate limiting is needed
   */
  private async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceWindowStart = now - this.windowStartTime;

    // Reset window if a minute has passed
    if (timeSinceWindowStart >= 60000) {
      this.windowStartTime = now;
      this.requestCount = 0;
      console.log("Rate limiter: Reset window");
    }

    // Check if we're at the rate limit
    if (this.requestCount >= this.config.requestsPerMinute) {
      const waitTime = 60000 - timeSinceWindowStart;
      console.log(`Rate limiter: Rate limit reached, waiting ${waitTime}ms`);
      await this.sleep(waitTime);

      // Reset window after waiting
      this.windowStartTime = Date.now();
      this.requestCount = 0;
    }

    // Check burst limit (minimum time between requests)
    if (this.lastRequestTime > 0) {
      const timeSinceLastRequest = now - this.lastRequestTime;
      const minInterval = 60000 / this.config.requestsPerMinute; // ms between requests

      if (timeSinceLastRequest < minInterval) {
        const waitTime = minInterval - timeSinceLastRequest;
        console.log(`Rate limiter: Burst limit, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current queue status
   */
  public getStatus(): {
    queueLength: number;
    processing: boolean;
    requestCount: number;
    windowStartTime: number;
    requestsPerMinute: number;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      requestCount: this.requestCount,
      windowStartTime: this.windowStartTime,
      requestsPerMinute: this.config.requestsPerMinute,
    };
  }

  /**
   * Clear the queue (emergency stop)
   */
  public clearQueue(): void {
    console.log(`Rate limiter: Clearing ${this.queue.length} queued requests`);

    this.queue.forEach((request) => {
      request.reject(new Error("Rate limiter queue cleared"));
    });

    this.queue = [];
    this.processing = false;
  }

  /**
   * Update rate limit configuration
   */
  public updateConfig(config: Partial<RateLimiterConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("Rate limiter: Configuration updated", this.config);
  }
}

// Export singleton instance with default configuration
export const rateLimiter = new RateLimiter({
  requestsPerMinute: 20, // Conservative limit for OpenRouter
  burstLimit: 3, // Allow small bursts
  queueTimeoutMs: 300000, // 5 minutes timeout
});

// Export factory function for custom configurations
export function createRateLimiter(
  config: Partial<RateLimiterConfig>
): RateLimiter {
  return new RateLimiter(config);
}
