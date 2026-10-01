import { roles } from "../../shared/permissions.js";
import { prisma } from "../db/prisma.js";

const userInclude = { role: true, assignments: true };
const loginUserInclude = { ...userInclude, credential: true };
const sessionInclude = { user: { include: userInclude } };

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
    return this.client.user.findUnique({ where: { email: email.toLowerCase() }, include: loginUserInclude });
  }

  findUserById(id) {
    return this.client.user.findUnique({ where: { id }, include: userInclude });
  }

  async createAgencyAdmin({ agencyName, fullName, email, passwordHash }) {
    const adminRole = await this.findRoleByName(roles.ADMIN);
    if (!adminRole) throw new Error("Admin role is not seeded");

    return this.client.agency.create({
      data: {
        name: agencyName,
        users: {
          create: {
            email: email.toLowerCase(),
            fullName,
            roleId: adminRole.id,
            credential: { create: { passwordHash } },
          },
        },
      },
      include: { users: { include: userInclude } },
    });
  }

  createSession(data) {
    return this.client.session.create({ data });
  }

  findSessionByTokenHash(tokenHash) {
    return this.client.session.findUnique({ where: { tokenHash }, include: sessionInclude });
  }

  touchSession(id, lastSeenAt) {
    return this.client.session.update({ where: { id }, data: { lastSeenAt } });
  }

  deleteSession(id) {
    return this.client.session.delete({ where: { id } }).catch(() => null);
  }

  deleteSessionByTokenHash(tokenHash) {
    return this.client.session.delete({ where: { tokenHash } }).catch(() => null);
  }

  updateCredential(userId, data) {
    return this.client.userCredential.update({ where: { userId }, data });
  }
}
