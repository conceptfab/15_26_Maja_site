import 'dotenv/config';
import { PrismaClient } from '../lib/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const flag = process.argv[2];

  if (flag !== '--confirm') {
    console.log('⚠️  Ten skrypt usunie WSZYSTKIE rezerwacje i zablokowane daty z bazy.');
    console.log('   Aby potwierdzić, uruchom:');
    console.log('');
    console.log('   npx tsx prisma/clear-reservations.ts --confirm');
    console.log('');
    process.exit(0);
  }

  console.log('Usuwanie danych...\n');

  const blockedCount = await prisma.blockedDate.count();
  const reservationCount = await prisma.reservation.count();

  // Kolejność: najpierw zależne tabele, potem główne
  const deletedBlocked = await prisma.blockedDate.deleteMany();
  console.log(`  BlockedDate:  usunięto ${deletedBlocked.count} / ${blockedCount}`);

  const deletedReservations = await prisma.reservation.deleteMany();
  console.log(`  Reservation:  usunięto ${deletedReservations.count} / ${reservationCount}`);

  console.log('\nGotowe. Baza wyczyszczona z rezerwacji i blokad.');
}

main()
  .catch((e) => {
    console.error('Błąd:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
