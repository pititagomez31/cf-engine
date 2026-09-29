import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '1688 Product Scraper | cf-engine',
  description: 'Minimal product scraper interface for 1688 wholesale items using cf-engine backend.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
