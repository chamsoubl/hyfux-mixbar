'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

type ClarityFunction = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    clarity?: ClarityFunction;
  }
}

const INTERNAL_VISITOR_KEY = 'internal';
const CLARITY_PROJECT_ID = 'z18rolrdpu';

export default function AnalyticsTracking() {
  const [shouldTrack, setShouldTrack] = useState(false);

  useEffect(() => {
    const me = new URLSearchParams(window.location.search).get('me');
    const optedOutFromQuery = me === '1' || me === '2';
    const isProductionSite = window.location.hostname === 'hyfux-mixbar.vercel.app';

    if (optedOutFromQuery) {
      try {
        window.localStorage.setItem(INTERNAL_VISITOR_KEY, 'true');
      } catch {
        // The query flag still opts out this visit if storage is unavailable.
      }
    }

    let isInternal = optedOutFromQuery;
    try {
      isInternal ||= window.localStorage.getItem(INTERNAL_VISITOR_KEY) === 'true';
    } catch {
      // If storage is unavailable, keep the visit tracked unless ?me=1 was used.
    }

    setShouldTrack(isProductionSite && !isInternal);
  }, []);

  useEffect(() => {
    if (!shouldTrack || document.getElementById('clarity-tracking-script')) return;

    const clarity = window.clarity || Object.assign(
      (...args: unknown[]) => {
        (clarity.q = clarity.q || []).push(args);
      },
      { q: [] as unknown[][] },
    );
    window.clarity = clarity;

    const script = document.createElement('script');
    script.id = 'clarity-tracking-script';
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
    document.head.appendChild(script);
  }, [shouldTrack]);

  if (!shouldTrack) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
