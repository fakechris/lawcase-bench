import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LawCase Bench - Law Firm CRM',
  description: 'Comprehensive law firm customer relationship management system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
