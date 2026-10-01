import { env } from "../config/env.js";

export function securityHeaders(_req, res, next) {
  res.set({
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Cross-Origin-Resource-Policy": "same-site",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  });
  next();
}

export function corsOptions() {
  const origins = env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
  return {
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) return callback(null, true);
      const error = new Error("Origin is not allowed by CORS policy");
      error.statusCode = 403;
      return callback(error);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
    maxAge: 86400,
  };
}
