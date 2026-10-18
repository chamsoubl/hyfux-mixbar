import { Suspense } from 'react';
import AdminClient from './AdminClient';

export const metadata = {
  robots: { index: false, follow: false },
  manifest: '/admin.webmanifest',
  icons: { apple: '/admin-icon-180.png' },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminClient />
    </Suspense>
  );
}
