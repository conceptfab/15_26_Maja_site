import 'dotenv/config';
import { PrismaClient } from '../lib/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
async function main() {
  const sections = await prisma.section.findMany({ select: { slug: true, bgImage: true } });
  for (const s of sections) console.log(s.slug, '->', s.bgImage);
}
main().finally(() => prisma.$disconnect());
