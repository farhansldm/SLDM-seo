import { prisma } from "../server/db/prisma.js";
import { roles } from "../shared/permissions.js";

async function main() {
  await Promise.all(Object.values(roles).map((name) => prisma.role.upsert({ where: { name }, update: {}, create: { name } })));
  const adminRole = await prisma.role.findUnique({ where: { name: roles.ADMIN } });
  const agency = await prisma.agency.create({ data: { name: "SLDM Demo Agency" } });
  await prisma.user.create({ data: { agencyId: agency.id, roleId: adminRole.id, email: "admin.demo@sldm.test", fullName: "Demo Admin", supabaseAuthId: "seed-admin" } });
  const client = await prisma.client.create({ data: { agencyId: agency.id, companyName: "Northstar Dental", status: "active", retainerAmount: 2500, retainerCycle: "monthly" } });
  await prisma.clientContact.create({ data: { clientId: client.id, name: "Riya Sharma", email: "riya@example.com", roleTitle: "Marketing Lead", isPrimary: true } });
  const website = await prisma.website.create({ data: { clientId: client.id, domain: "northstardental.example", cms: "WordPress", businessCategory: "Dental Clinic", targetLocations: ["Mumbai", "Pune"], targetSearchEngines: ["google", "bing"], preferredLocale: "en-IN", primaryCountry: "India", isMock: true } });
  const competitor = await prisma.competitor.create({ data: { agencyId: agency.id, clientId: client.id, websiteId: website.id, domain: "brightdental.example", name: "Bright Dental", priority: "high", source: "seed" } });
  await prisma.competitorBacklink.create({ data: { competitorId: competitor.id, sourceUrl: "https://localhealth.example/dentists", targetUrl: "https://brightdental.example", domainAuthority: 48, anchorText: "dentist in Mumbai", isDofollow: true, source: "seed" } });
  console.log(`Seeded agency ${agency.id}, client ${client.id}, website ${website.id}`);
}

main().finally(() => prisma.$disconnect());
