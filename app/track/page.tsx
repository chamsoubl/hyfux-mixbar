'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

type Result = {
  status: string;
  created_at: string;
  total: number;
  discount: number;
  cancel_reason: string | null;
  items: { name: string; quantity: number; line_total: number }[];
};

const STEPS = [
  { key: 'new', label: 'Received' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
];

const cash = (n: number) => `${Number(n || 0).toLocaleString('fr-DZ')} DA`;

export default function TrackPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const lookup = useCallback(async (value: string, quiet = false) => {
    const c = value.trim().replace('#', '');
    if (!c) return;
    if (!quiet) setLoading(true);
    setError('');
    const { data, error: err } = await supabase.rpc('get_order_status', { p_code: c });
    if (!quiet) setLoading(false);
    if (err) {
      setError('Could not check the order. Please try again.');
      return;
    }
    if (!data) {
      setResult(null);
      setError('No order found with this code. Check it and try again.');
      return;
    }
    setResult(data as Result);
  }, []);

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('code');
    if (c) {
      setCode(c);
      lookup(c);
    }
  }, [lookup]);

  // Refresh every 15 seconds while the order is still active.
  useEffect(() => {
    if (!result || !['new', 'preparing', 'ready'].includes(result.status)) return;
    const t = setInterval(() => lookup(code, true), 15000);
    return () => clearInterval(t);
  }, [result, code, lookup]);

  function submit(e: FormEvent) {
    e.preventDefault();
    lookup(code);
  }

  const status = result?.status === 'finished' ? 'delivered' : result?.status;
  const stepIndex = STEPS.findIndex((s) => s.key === status);
  const stopped = status === 'rejected' || status === 'cancelled';

  const card: React.CSSProperties = {
    border: '1px solid rgba(0,240,230,0.25)',
    borderRadius: 18,
    padding: 24,
    background: 'linear-gradient(180deg,#081a21,#060f14)',
  };

  return (
    <main style={{ minHeight: '100vh', background: '#03080b', color: '#f4f8fa', fontFamily: 'Inter, system-ui, sans-serif', padding: '40px 16px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'grid', gap: 20 }}>
        <a href="/" style={{ color: '#00f0e6', fontSize: 13, fontWeight: 700 }}>← Back to the store</a>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, textTransform: 'uppercase' }}>Track your order</h1>

        <form onSubmit={submit} style={{ ...card, display: 'grid', gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b6c7cd' }}>
            Order code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your order code"
              style={{ display: 'block', width: '100%', marginTop: 8, padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 14 }}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '14px 24px', borderRadius: 999, border: 0, background: '#00f0e6', color: '#021012', fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}
          >
            {loading ? 'Checking…' : 'Track order'}
          </button>
        </form>

        {error && (
          <div style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(255,77,6,0.45)', background: 'rgba(255,77,6,0.08)', color: '#ffd9c9' }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ ...card, display: 'grid', gap: 18 }}>
            {stopped ? (
              <div>
                <strong style={{ color: '#ff8a5c', fontSize: 18 }}>
                  Order {status === 'rejected' ? 'rejected' : 'cancelled'}
                </strong>
                {result.cancel_reason && <p style={{ margin: '8px 0 0', color: '#c3d2d7' }}>Reason: {result.cancel_reason}</p>}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {STEPS.map((s, i) => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: i <= stepIndex ? 1 : 0.35 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: i <= stepIndex ? '#00f0e6' : 'transparent', border: '2px solid #00f0e6' }} />
                    <span style={{ fontWeight: i === stepIndex ? 800 : 500, color: i === stepIndex ? '#00f0e6' : '#fff' }}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, display: 'grid', gap: 6, fontSize: 14 }}>
              {result.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{it.quantity} × {it.name}</span>
                  <span>{cash(it.line_total)}</span>
                </div>
              ))}
              {Number(result.discount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9db0b7' }}>
                  <span>Discount</span>
                  <span>− {cash(result.discount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#00f0e6', marginTop: 6 }}>
                <span>Total</span>
                <span>{cash(result.total)}</span>
              </div>
              <small style={{ color: '#9db0b7' }}>
                Placed {new Date(result.created_at).toLocaleString('fr-DZ')}
              </small>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}