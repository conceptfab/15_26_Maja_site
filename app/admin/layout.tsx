import './admin.css';

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
    <div className="dark min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
