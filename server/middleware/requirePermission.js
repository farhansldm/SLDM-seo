import { hasPermission } from "../../shared/permissions.js";

export function requirePermission(permission) {
  return (req, res, next) => {
    const role = req.auth?.role;
    if (!role || !hasPermission(role, permission)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}