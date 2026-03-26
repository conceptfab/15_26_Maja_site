import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="pl" className={cn("font-sans", geist.variable)}>
      <head>
        <link
          rel="preconnect"
          href="https://use.typekit.net"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href="https://use.typekit.net/zpt0osi.css" />
      </head>
      <body>
        <a
          href="#main-content"
          className="skip-to-content"
        >
          Przejdź do treści
        </a>
        <div id="main-content">
          {children}
        </div>
      </body>
    </html>
  );
}
