import { Worker } from "bullmq";

import { env } from "../config/env.js";
import { PrismaAuditRepository } from "../repositories/auditRepository.js";
import { TechnicalAuditService } from "../services/technicalAuditService.js";

const service = new TechnicalAuditService(new PrismaAuditRepository());

const worker = new Worker(
  "seo-jobs",
  async (job) => {
    if (job.name !== "technical-audit") throw new Error(`Unsupported SEO job: ${job.name}`);
    return service.processAuditJob(job.data);
  },
  { connection: { url: env.REDIS_URL }, concurrency: 2 },
);

worker.on("completed", (job) => console.log(`Audit job ${job.id} completed`));
worker.on("failed", (job, error) => console.error(`Audit job ${job?.id ?? "unknown"} failed`, error));

async function shutdown() {
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
