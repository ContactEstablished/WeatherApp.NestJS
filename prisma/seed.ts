import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // Phase 2 ships an intentionally minimal seed; Phase 5 owns execution.
  // Optional starter row:
  // await prisma.userPreference.upsert({
  //   where: { userId: 'anonymous' },
  //   update: {},
  //   create: { userId: 'anonymous', unitSystem: 'imperial' },
  // });
}
main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
