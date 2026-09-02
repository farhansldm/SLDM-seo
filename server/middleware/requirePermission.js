import { hasPermission } from "../../shared/permissions.js";

export function requirePermission(permission) {
  return requireAnyPermission(permission);
}

export function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    const role = req.auth?.role;
    if (!role || !permissions.some((permission) => hasPermission(role, permission))) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}
