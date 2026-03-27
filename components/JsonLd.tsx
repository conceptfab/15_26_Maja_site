export function JsonLd() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hommm.pl';

  const lodgingBusiness = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: 'HOMMM',
    description: 'Domek na wyłączność w sercu natury. Cisza, prywatność, wypoczynek.',
    url: baseUrl,
    image: `${baseUrl}/og-image.jpg`,
    telephone: '',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'PL',
    },
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Prywatność', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Cisza', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Natura', value: true },
    ],
    numberOfRooms: 1,
    priceRange: '$$',
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Strona główna',
        item: baseUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(lodgingBusiness) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  );
}
