import { readSessionToken } from "../auth/session.js";
import { toAuthContext } from "../services/authService.js";

export function authenticate(userRepository, sessionProvider) {
  return async (req, res, next) => {
    try {
      const token = readSessionToken(req);
      if (!token) return res.status(401).json({ error: "Authentication required" });

      const identity = await sessionProvider.verifySessionToken(token);
      const user = identity.user ?? await userRepository.findUserByAuthToken?.(identity.id);
      if (!user || !user.isActive) return res.status(403).json({ error: "Application profile not found or inactive" });

      req.sessionToken = token;
      req.session = identity.session ?? null;
      req.auth = toAuthContext(user);
      return next();
    } catch (error) {
      return res.status(error.statusCode ?? 401).json({ error: error.message ?? "Invalid or expired session" });
    }
  };
}
