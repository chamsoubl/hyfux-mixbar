import { Suspense } from 'react';
import AdminClient from './AdminClient';

export const metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminClient />
    </Suspense>
  );
}