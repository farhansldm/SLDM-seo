import cors from "cors";
import express from "express";

import { createAuthRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { createKeywordRouter } from "./routes/keywords.js";
import { createSeoDashboardRouter } from "./routes/seoDashboard.js";
import { createAuditRouter } from "./routes/audits.js";
import { createClientRouter } from "./routes/clients.js";
import { createWebsiteRouter } from "./routes/websites.js";

export function createApp(options = {}) {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use("/api/v1", healthRouter);
  app.use("/api/v1/auth", createAuthRouter(options));
  app.use("/api/v1", createClientRouter(options));
  app.use("/api/v1", createWebsiteRouter(options));
  app.use("/api/v1", createKeywordRouter(options));
  app.use("/api/v1", createSeoDashboardRouter(options));
  app.use("/api/v1", createAuditRouter(options));

  app.use((req, res) => {
    res.status(404).json({ error: "Not found", path: req.path });
  });

  return app;
}