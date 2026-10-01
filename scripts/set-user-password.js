import { hashPassword } from "../server/auth/password.js";
import { prisma } from "../server/db/prisma.js";

async function main() {
  const email = process.env.AUTH_USER_EMAIL?.trim().toLowerCase();
  const password = process.env.AUTH_USER_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("AUTH_USER_EMAIL and AUTH_USER_PASSWORD (minimum 12 characters) are required");
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new Error("User was not found");
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.userCredential.upsert({
      where: { userId: user.id },
      update: { passwordHash, failedAttempts: 0, lockedUntil: null, passwordChangedAt: new Date() },
      create: { userId: user.id, passwordHash },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  console.log(`Password updated and sessions revoked for ${email}`);
}

main().finally(() => prisma.$disconnect());
