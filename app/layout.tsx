import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import '@/index.css';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Phantom — private rooms',
  description: 'Invite-only rooms with messages encrypted in your browser.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0b0b0c',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <div id="root" className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
