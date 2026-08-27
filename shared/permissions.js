export const roles = Object.freeze({
  ADMIN: "admin",
  MANAGER: "manager",
  EMPLOYEE: "employee",
  CLIENT: "client",
});

export const rolePermissions = Object.freeze({
  [roles.ADMIN]: [
    "agency:manage",
    "team:manage",
    "client:manage_all",
    "client:view_internal",
    "website:manage_all",
    "keyword:manage_all",
    "audit:manage_all",
    "task:manage_all",
    "report:approve_all",
    "integration:manage_all",
    "ai:use_internal",
  ],
  [roles.MANAGER]: [
    "client:manage_assigned",
    "client:view_internal",
    "website:manage_assigned",
    "keyword:manage_assigned",
    "audit:manage_assigned",
    "task:assign_assigned",
    "report:approve_assigned",
    "integration:manage_assigned",
    "ai:use_internal",
  ],
  [roles.EMPLOYEE]: [
    "client:view_assigned",
    "client:view_internal",
    "website:view_assigned",
    "keyword:view_assigned",
    "audit:view_assigned",
    "task:update_assigned",
    "ai:use_internal",
  ],
  [roles.CLIENT]: ["client:view_own_safe", "website:view_own_safe", "dashboard:view_own_safe", "report:view_approved"],
});

export function hasPermission(role, permission) {
  return rolePermissions[role]?.includes(permission) ?? false;
}