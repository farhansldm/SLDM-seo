import { Queue } from "bullmq";

import { env } from "../config/env.js";

export const seoJobQueue = new Queue("seo-jobs", {
  connection: {
    url: env.REDIS_URL,
  },
});