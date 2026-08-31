import { SupabaseAuthProvider } from "../auth/supabase.js";
import { PrismaUserRepository } from "../repositories/userRepository.js";
import { toAuthContext } from "../services/authService.js";

export function authenticate(
  userRepository = new PrismaUserRepository(),
  authProvider = new SupabaseAuthProvider(),
) {
  return async (req, res, next) => {
    try {
      const header = req.get("authorization") ?? "";
      const [scheme, token] = header.split(" ");
      if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ error: "Missing bearer token" });
      }

      const supabaseUser = await authProvider.verifyAccessToken(token);
      const user = await userRepository.findUserBySupabaseAuthId(supabaseUser.id);
      if (!user || !user.isActive) {
        return res.status(403).json({ error: "Application profile not found or inactive" });
      }

      req.supabaseUser = supabaseUser;
      req.auth = toAuthContext(user);
      return next();
    } catch (error) {
      return res.status(error.statusCode ?? 401).json({ error: error.message ?? "Invalid or expired session" });
    }
  };
}
