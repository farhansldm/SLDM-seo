import { roles } from "./permissions.js";

export const clientRestrictedFields = new Set([
  "retainerAmount",
  "retainerCycle",
  "internalNotes",
  "note",
  "credentialsEncrypted",
  "passwordHash",
  "integrationCredentials",
  "employeeWorkload",
  "internalAiOutput",
]);

export function toClientSafeRecord(record, role) {
  if (role !== roles.CLIENT) {
    return { ...record };
  }

  return Object.fromEntries(Object.entries(record).filter(([key]) => !clientRestrictedFields.has(key)));
}