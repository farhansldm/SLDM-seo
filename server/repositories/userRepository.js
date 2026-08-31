import { roles } from "../../shared/permissions.js";
import { prisma } from "../db/prisma.js";

const userInclude = { role: true, assignments: true };

export class PrismaUserRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findRoleByName(name) {
    return this.client.role.findUnique({ where: { name } });
  }

  async ensureRoles() {
    await Promise.all(
      Object.values(roles).map((name) =>
        this.client.role.upsert({ where: { name }, update: {}, create: { name } }),
      ),
    );
  }

  findUserByEmail(email) {
    return this.client.user.findUnique({ where: { email: email.toLowerCase() }, include: userInclude });
  }

  findUserById(id) {
    return this.client.user.findUnique({ where: { id }, include: userInclude });
  }

  findUserBySupabaseAuthId(supabaseAuthId) {
    return this.client.user.findUnique({ where: { supabaseAuthId }, include: userInclude });
  }

  async createAgencyAdmin({ agencyName, fullName, email, supabaseAuthId }) {
    const adminRole = await this.findRoleByName(roles.ADMIN);
    if (!adminRole) throw new Error("Admin role is not seeded");

    return this.client.agency.create({
      data: {
        name: agencyName,
        users: {
          create: {
            email: email.toLowerCase(),
            fullName,
            supabaseAuthId,
            roleId: adminRole.id,
          },
        },
      },
      include: { users: { include: userInclude } },
    });
  }
}
