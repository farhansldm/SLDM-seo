import { roles } from "../../shared/permissions.js";
import { hashPassword, verifyPassword } from "../auth/password.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function authError(message = "Invalid email or password", statusCode = 401) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export class AuthService {
  constructor(userRepository, sessionProvider, now = Date.now) {
    this.userRepository = userRepository;
    this.sessionProvider = sessionProvider;
    this.now = now;
  }

  async signup(input, metadata = {}) {
    await this.userRepository.ensureRoles?.();
    if (await this.userRepository.findUserByEmail(input.email)) throw authError("An account with this email already exists", 409);
    const passwordHash = await hashPassword(input.password);
    const agency = await this.userRepository.createAgencyAdmin({ ...input, email: input.email.toLowerCase(), passwordHash });
    const user = agency.users[0];
    const session = await this.sessionProvider.createSession(user.id, metadata);
    return { user: toAuthContext(user), ...session };
  }

  async login(input, metadata = {}) {
    const user = await this.userRepository.findUserByEmail(input.email);
    const credential = user?.credential;
    if (!user || !credential || !user.isActive) throw authError();
    if (credential.lockedUntil && credential.lockedUntil > new Date(this.now())) {
      throw authError("Account temporarily locked after repeated failed attempts", 423);
    }

    const valid = await verifyPassword(input.password, credential.passwordHash);
    if (!valid) {
      const failedAttempts = credential.failedAttempts + 1;
      await this.userRepository.updateCredential(user.id, {
        failedAttempts: failedAttempts >= MAX_FAILED_ATTEMPTS ? 0 : failedAttempts,
        lockedUntil: failedAttempts >= MAX_FAILED_ATTEMPTS ? new Date(this.now() + LOCK_DURATION_MS) : null,
      });
      throw authError();
    }

    await this.userRepository.updateCredential(user.id, { failedAttempts: 0, lockedUntil: null });
    const session = await this.sessionProvider.createSession(user.id, metadata);
    return { user: toAuthContext(user), ...session };
  }

  logout(token) {
    return this.sessionProvider.revokeSession(token);
  }
}

export function toAuthContext(user) {
  return {
    id: user.id,
    agencyId: user.agencyId,
    role: user.role?.name ?? roles.CLIENT,
    email: user.email,
    fullName: user.fullName,
    clientId: user.clientId,
    assignedClientIds: user.assignments?.map((assignment) => assignment.clientId) ?? [],
  };
}
