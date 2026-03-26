import 'dotenv/config';
import { PrismaClient } from '../lib/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { getSeedAdminEmail } from '../lib/env';

const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = getSeedAdminEmail();

  // Create admin
  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Admin',
      isActive: true,
    },
  });

  console.log('Admin created:', admin.email);

  // Create home page
  const homePage = await prisma.page.upsert({
    where: { slug: 'home' },
    update: {},
    create: {
      slug: 'home',
      title: 'Strona główna',
      isHome: true,
      isVisible: true,
      order: 0,
    },
  });

  console.log('Home page created:', homePage.slug);

  // Create sections for home page
  const sections = [
    {
      slug: 'hero',
      order: 0,
      titlePl: 'Hero',
      titleEn: 'Hero',
      contentPl: { heading: 'YOUR SPECIAL TIME', subheading: 'HOMMM' },
      contentEn: { heading: 'YOUR SPECIAL TIME', subheading: 'HOMMM' },
    },
    {
      slug: 'koncept',
      order: 1,
      titlePl: 'Koncept HOMMM',
      titleEn: 'HOMMM Concept',
      contentPl: {
        heading: 'YOUR SPECIAL TIME',
        subheading: 'KONCEPT HOMMM',
        body: 'To przykładowy blok treści, który opisuje charakter miejsca i spokojny rytm wypoczynku.',
      },
      contentEn: {
        heading: 'YOUR SPECIAL TIME',
        subheading: 'HOMMM CONCEPT',
        body: 'This is a sample content block that describes the character of the place and the calm rhythm of rest.',
      },
    },
    {
      slug: 'miejsce',
      order: 2,
      titlePl: 'Miejsce',
      titleEn: 'Place',
      contentPl: {
        heading: 'YOUR SPECIAL PLACE',
        subheading: 'CHCESZ WYPOCZĄĆ W CISZY I OTOCZENIU NATURY?',
        body: 'To przykładowy tekst do sekcji miejsca — podkreśla kameralność, naturę i oddech od codziennego tempa.',
      },
      contentEn: {
        heading: 'YOUR SPECIAL PLACE',
        subheading: 'WANT TO REST IN SILENCE AND SURROUNDED BY NATURE?',
        body: 'This is a sample text for the place section — emphasizing intimacy, nature and a break from everyday pace.',
      },
    },
    {
      slug: 'kontakt',
      order: 3,
      titlePl: 'Kontakt',
      titleEn: 'Contact',
      contentPl: {
        email: 'hommm@hommm.eu',
        phone: '+48 608 259 945',
        company: 'Banana Gun Design Maria Budner',
        address: 'ul. Sanocka 39 m 5, 93-038 Łódź',
        nip: '7292494164',
      },
      contentEn: {
        email: 'hommm@hommm.eu',
        phone: '+48 608 259 945',
        company: 'Banana Gun Design Maria Budner',
        address: 'ul. Sanocka 39 m 5, 93-038 Łódź',
        nip: '7292494164',
      },
    },
  ];

  for (const section of sections) {
    await prisma.section.upsert({
      where: { pageId_slug: { pageId: homePage.id, slug: section.slug } },
      update: {},
      create: {
        pageId: homePage.id,
        ...section,
      },
    });
    console.log('Section created:', section.slug);
  }

  // Create default site settings
  const defaultSettings = [
    { key: 'site_name', value: { pl: 'HOMMM', en: 'HOMMM' } },
    { key: 'price_per_night', value: { amount: 204.5, currency: 'PLN' } },
    { key: 'max_guests', value: { count: 6 } },
    { key: 'contact_email', value: { email: 'hommm@hommm.eu' } },
    { key: 'contact_phone', value: { phone: '+48 608 259 945' } },
  ];

  for (const setting of defaultSettings) {
    await prisma.siteSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
    console.log('Setting created:', setting.key);
  }

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
