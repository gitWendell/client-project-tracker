import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Client Project Tracker',
  description: 'Track client projects, monitor progress, and manage priorities.',
};

/**
 * A system font stack is used instead of `next/font/google` so that a build
 * never depends on reaching Google's servers.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
