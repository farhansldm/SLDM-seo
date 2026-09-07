import { createApp } from "./app.js";
import { env } from "./config/env.js";

let auditDispatcher;
if (env.JOB_MODE === "redis") {
  const { RedisAuditDispatcher } = await import("./workers/queue.js");
  auditDispatcher = new RedisAuditDispatcher();
}

const app = createApp({ auditDispatcher });

app.listen(env.PORT, () => {
  console.log(`SEO Agency Platform API listening on port ${env.PORT}`);
});
