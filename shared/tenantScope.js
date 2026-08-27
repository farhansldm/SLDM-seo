import { roles } from "./permissions.js";

export function getAllowedClientIds(user) {
  if (!user) return [];
  if (user.role === roles.ADMIN) return null;
  if (user.role === roles.CLIENT) return user.clientId ? [user.clientId] : [];
  return user.assignedClientIds ?? [];
}

export function canAccessClient(user, clientId) {
  const allowedClientIds = getAllowedClientIds(user);
  if (allowedClientIds === null) return true;
  return allowedClientIds.includes(clientId);
}

export function scopeRecordsByClient(records, user) {
  const allowedClientIds = getAllowedClientIds(user);
  if (allowedClientIds === null) {
    return records.filter((record) => record.agencyId === user.agencyId);
  }
  return records.filter((record) => allowedClientIds.includes(record.clientId));
}

export function scopedClientWhere(user) {
  const allowedClientIds = getAllowedClientIds(user);
  if (allowedClientIds === null) return { agencyId: user.agencyId };
  return { id: { in: allowedClientIds } };
}