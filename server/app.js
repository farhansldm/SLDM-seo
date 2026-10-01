import cors from "cors";
import express from "express";

import { createAuthRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { createKeywordRouter } from "./routes/keywords.js";
import { createSeoDashboardRouter } from "./routes/seoDashboard.js";
import { createAuditRouter } from "./routes/audits.js";
import { createClientRouter } from "./routes/clients.js";
import { createWebsiteRouter } from "./routes/websites.js";
import { createTaskRouter } from "./routes/tasks.js";
import { createReportRouter } from "./routes/reports.js";
import { createAiRouter } from "./routes/ai.js";
import { env } from "./config/env.js";
import { corsOptions, securityHeaders } from "./middleware/security.js";

export function createApp(options = {}) {
  const app = express();

  app.disable("x-powered-by");
  if (env.TRUST_PROXY) app.set("trust proxy", 1);
  app.use(securityHeaders);
  app.use(cors(corsOptions()));
  app.use(express.json({ limit: env.JSON_BODY_LIMIT }));
  app.use("/api/v1", healthRouter);
  app.use("/api/v1/auth", createAuthRouter(options));
  app.use("/api/v1", createClientRouter(options));
  app.use("/api/v1", createWebsiteRouter(options));
  app.use("/api/v1", createKeywordRouter(options));
  app.use("/api/v1", createSeoDashboardRouter(options));
  app.use("/api/v1", createAuditRouter(options));
  app.use("/api/v1", createTaskRouter(options));
  app.use("/api/v1", createReportRouter(options));
  app.use("/api/v1", createAiRouter(options));

  app.use((req, res) => {
    res.status(404).json({ error: "Not found", path: req.path });
  });

  app.use((error, _req, res, next) => {
    void next;
    const statusCode = error.statusCode ?? (error.type === "entity.too.large" ? 413 : 500);
    return res.status(statusCode).json({ error: statusCode === 500 ? "Internal server error" : error.message });
  });

  return app;
}
