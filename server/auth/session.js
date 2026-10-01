import { createHash, randomBytes } from "node:crypto";

import { env } from "../config/env.js";
import { PrismaUserRepository } from "../repositories/userRepository.js";

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function readSessionToken(req, cookieName = env.SESSION_COOKIE_NAME) {
  const cookies = Object.fromEntries((req.get("cookie") ?? "").split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const separator = part.indexOf("=");
    return separator < 0 ? [part, ""] : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
  }));
  if (cookies[cookieName]) return cookies[cookieName];
  const [scheme, bearerToken] = (req.get("authorization") ?? "").split(" ");
  return scheme === "Bearer" ? bearerToken : null;
}

export function setSessionCookie(res, token, expiresAt, config = env) {
  res.cookie(config.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(res, config = env) {
  res.clearCookie(config.SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}

export class DatabaseSessionProvider {
  constructor(repository = new PrismaUserRepository(), config = env, now = Date.now) {
    this.repository = repository;
    this.config = config;
    this.now = now;
  }

  async createSession(userId, metadata = {}) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(this.now() + this.config.SESSION_TTL_HOURS * 3600000);
    await this.repository.createSession({
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
      ipAddress: metadata.ipAddress?.slice(0, 64) || null,
      userAgent: metadata.userAgent?.slice(0, 500) || null,
    });
    return { token, expiresAt };
  }

  async verifySessionToken(token) {
    const session = await this.repository.findSessionByTokenHash(hashSessionToken(token));
    if (!session || session.expiresAt <= new Date(this.now()) || !session.user?.isActive) {
      if (session) await this.repository.deleteSession(session.id);
      const error = new Error("Invalid or expired session");
      error.statusCode = 401;
      throw error;
    }
    if (this.now() - new Date(session.lastSeenAt).getTime() > 300000) {
      await this.repository.touchSession(session.id, new Date(this.now()));
    }
    return { session, user: session.user };
  }

  async revokeSession(token) {
    if (token) await this.repository.deleteSessionByTokenHash(hashSessionToken(token));
  }
}
