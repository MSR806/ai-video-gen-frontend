import type { Metadata } from 'next';
import { Courier_Prime, Geist, Geist_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import '@presentation/styles/globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  display: 'swap',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  display: 'swap',
  subsets: ['latin'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  display: 'swap',
  subsets: ['latin'],
});

const courierPrime = Courier_Prime({
  variable: '--font-courier-prime',
  weight: ['400', '700'],
  display: 'swap',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AI Video Content Generator',
  description: 'Create stunning video content with AI-powered tools',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${courierPrime.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
