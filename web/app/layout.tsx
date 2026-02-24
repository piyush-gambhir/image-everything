import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Next.js Template',
    template: '%s | Next.js Template',
  },
  description: 'Modern Next.js starter template with TypeScript, Tailwind CSS, and essential utilities',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  keywords: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Template'],
  authors: [{ name: 'Your Name' }],
  creator: 'Your Name',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Next.js Template',
    description: 'Modern Next.js starter template with TypeScript, Tailwind CSS, and essential utilities',
    siteName: 'Next.js Template',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Next.js Template',
    description: 'Modern Next.js starter template with TypeScript, Tailwind CSS, and essential utilities',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
