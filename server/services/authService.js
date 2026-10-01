import { roles } from "../../shared/permissions.js";

function authError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async bootstrapAgencyAdmin(supabaseUser, input) {
    await this.userRepository.ensureRoles?.();
    const email = supabaseUser.email?.toLowerCase();
    if (!email) throw authError("Supabase user email is required", 422);

    const existingAuthUser = await this.userRepository.findUserBySupabaseAuthId(supabaseUser.id);
    if (existingAuthUser) return { user: toAuthContext(existingAuthUser) };
    const existingEmailUser = await this.userRepository.findUserByEmail(email);
    if (existingEmailUser) {
      if (existingEmailUser.supabaseAuthId) throw authError("Email already exists in this workspace", 409);
      const linkedUser = await this.userRepository.linkSupabaseIdentity(existingEmailUser.id, supabaseUser.id);
      return { user: toAuthContext(linkedUser) };
    }

    const agency = await this.userRepository.createAgencyAdmin({
      agencyName: input.agencyName,
      fullName: input.fullName,
      email,
      supabaseAuthId: supabaseUser.id,
    });
    return { user: toAuthContext(agency.users[0]) };
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
