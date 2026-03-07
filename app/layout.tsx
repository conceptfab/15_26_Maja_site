import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HOMMM',
  description: 'HOMMM',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <head>
        <link
          rel="preconnect"
          href="https://use.typekit.net"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href="https://use.typekit.net/zpt0osi.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
