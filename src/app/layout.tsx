import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ASTRA — The First Orbit',
  description: 'ASTRA is an early game prototype for testing gameplay parameters. Its fictional values are not NASA-validated.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
