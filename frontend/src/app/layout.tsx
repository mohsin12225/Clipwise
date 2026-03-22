import type { Metadata } from 'next';
import { ThemeScript } from '@/components/layout/ThemeScript';
import { AppShell } from '@/components/layout/AppShell';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  ),
  title: 'ClipWise — AI-Powered Video Clip Generator',
  description:
    'Upload long videos and let AI automatically generate engaging short clips with captions. Free, local, and private.',
  keywords: [
    'video editor',
    'AI clips',
    'video processing',
    'captions',
    'short form content',
  ],
  openGraph: {
    title: 'ClipWise — AI-Powered Video Clip Generator',
    description:
      'Upload long videos and let AI generate short clips automatically.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}