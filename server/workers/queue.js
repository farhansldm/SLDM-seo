import { Queue } from "bullmq";

import { env } from "../config/env.js";

let seoJobQueue;

export function getSeoJobQueue() {
  if (!seoJobQueue) {
    seoJobQueue = new Queue("seo-jobs", { connection: { url: env.REDIS_URL } });
  }
  return seoJobQueue;
}

export class RedisAuditDispatcher {
  constructor(queue = getSeoJobQueue()) {
    this.queue = queue;
  }

  async dispatch(job) {
    return this.queue.add("technical-audit", job, {
      jobId: `technical-audit-${job.crawlRunId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }
}
