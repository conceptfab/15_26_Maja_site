import 'dotenv/config';
import { PrismaClient } from '../lib/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { getSeedAdminEmail } from '../lib/env';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
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
      slug: 'rezerwacja',
      order: 3,
      titlePl: 'Rezerwacja',
      titleEn: 'Reservation',
      contentPl: {
        title: 'Zarezerwuj swój czas',
        description: 'Wybierz daty i poczuj spokój Hommm. Nasz kalendarz pokazuje aktualną dostępność apartamentów i pozwala szybko sprawdzić najlepszy termin pobytu.',
        description2: 'Zaplanuj pobyt w miejscu, gdzie natura spotyka się z komfortem, a galeria od razu pokazuje rytm przestrzeni i najważniejsze detale.',
        checkin: 'Zameldowanie',
        checkout: 'Wymeldowanie',
        guests_label: 'Goście',
        submit: 'REZERWUJ',
        note: 'Płatność nie zostanie jeszcze naliczona',
        clear: 'Wyczyść daty',
        info: 'Rezerwacja zostanie potwierdzona w ciągu 24h od złożenia.',
        night_one: 'noc',
        night_few: 'noce',
        night_many: 'nocy',
        guest_one: 'gość',
        guest_few: 'gości',
      },
      contentEn: {
        title: 'Book your time',
        description: 'Choose your dates and feel the peace of Hommm. Our calendar shows current availability and allows you to quickly find the best dates for your stay.',
        description2: 'Plan your stay in a place where nature meets comfort, and the gallery instantly shows the rhythm of the space and its most important details.',
        checkin: 'Check-in',
        checkout: 'Check-out',
        guests_label: 'Guests',
        submit: 'BOOK NOW',
        note: "You won't be charged yet",
        clear: 'Clear dates',
        info: 'Your reservation will be confirmed within 24 hours.',
        night_one: 'night',
        night_few: 'nights',
        night_many: 'nights',
        guest_one: 'guest',
        guest_few: 'guests',
      },
    },
    {
      slug: 'menu',
      order: 6,
      titlePl: 'Menu nawigacyjne',
      titleEn: 'Navigation menu',
      contentPl: {
        koncept_label: 'KONCEPT',
        miejsca_label: 'MIEJSCA',
        rezerwuj_label: 'REZERWUJ',
      },
      contentEn: {
        koncept_label: 'CONCEPT',
        miejsca_label: 'PLACES',
        rezerwuj_label: 'BOOK',
      },
    },
    {
      slug: 'stopka',
      order: 5,
      titlePl: 'Stopka',
      titleEn: 'Footer',
      contentPl: {
        koncept_label: 'KONCEPT',
        miejsca_label: 'MIEJSCA',
        rezerwuj_label: 'REZERWUJ',
        corporate_title: 'DANE KORPORACYJNE:',
        contact_title: 'KONTAKT:',
        email: 'hommm@hommm.eu',
        phone: '+48 608 259 945',
        company: 'Banana Gun Design Maria Budner',
        address: 'ul. Sanocka 39 m 5, 93-038 Łódź',
        nip: '7292494164',
      },
      contentEn: {
        koncept_label: 'CONCEPT',
        miejsca_label: 'PLACES',
        rezerwuj_label: 'BOOK',
        corporate_title: 'CORPORATE:',
        contact_title: 'CONTACT:',
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
      update: { order: section.order },
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
