import { roles } from "../../shared/permissions.js";

export class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async bootstrapAgencyAdmin(supabaseUser, input) {
    await this.userRepository.ensureRoles?.();

    const email = supabaseUser.email?.toLowerCase();
    if (!email) {
      const error = new Error("Supabase user email is required");
      error.statusCode = 422;
      throw error;
    }

    const existingAuthUser = await this.userRepository.findUserBySupabaseAuthId(supabaseUser.id);
    if (existingAuthUser) return { user: toAuthContext(existingAuthUser) };

    const existingEmailUser = await this.userRepository.findUserByEmail(email);
    if (existingEmailUser) {
      const error = new Error("Email already exists in this workspace");
      error.statusCode = 409;
      throw error;
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
