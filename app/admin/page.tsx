import { Suspense } from 'react';
import AdminClient from './AdminClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminClient />
    </Suspense>
  );
}