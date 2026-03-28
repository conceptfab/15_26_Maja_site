import './admin.css';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

export const metadata = {
  title: 'HOMMM Admin',
  description: 'Panel administracyjny HOMMM',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`dark min-h-screen bg-background text-foreground ${inter.className}`}>
      {children}
      <Toaster theme="dark" richColors position="top-right" />
    </div>
  );
}
