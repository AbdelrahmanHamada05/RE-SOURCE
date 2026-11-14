import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RE:SOURCE — Junior Astronaut Mission Trainer',
  description: 'RE:SOURCE is an educational lunar mission game. Mission events and resource values are simulated, not NASA measurements.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
