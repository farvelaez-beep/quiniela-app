import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quiniela Mundial 2026',
  description: 'La quiniela del Mundial entre amigos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-body bg-black text-white">{children}</body>
    </html>
  );
}
