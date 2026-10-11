import { Suspense } from 'react';
import StoreClient from './StoreClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StoreClient />
    </Suspense>
  );
}