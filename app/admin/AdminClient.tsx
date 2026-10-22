"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/* ---------- Config: change these if your table names differ ---------- */
const T_PRODUCTS = "products";
const T_ORDERS = "orders";
const T_REVIEWS = "reviews";
const T_SETTINGS = "business_settings"; // single row with id = 1
const T_EXPENSES = "expenses";
const IMAGE_BUCKET = "product-images";
const DONE_STATUSES = ["delivered", "finished"];
const WEEK_DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];
const ORDER_SELECT =
  "*, customers(name, room, block, contact, notes), order_items(id, product_id, product_name, quantity, unit_price, line_total, line_cost)";

/* ---------- Types ---------- */
type Product = {
  id: string | number;
  name: string;
  price: number;
  cost?: number | null;
  available?: boolean;
  sold_out?: boolean | null;
  manual_sold_out?: boolean | null;
  ingredient_sold_out?: boolean | null;
  featured?: boolean | null;
  category?: string | null;
  description?: string | null;
  image_url?: string | null;
};

type Order = {
  id: string;
  created_at: string;
  customer_id?: string | null;
  total?: number | null;
  discount?: number | null;
  fulfillment?: string | null;
  delivery_fee?: number | null;
  refund_amount?: number | null;
  status?: string | null;
  notes?: string | null;
  cancel_reason?: string | null;
  customers?: {
    name?: string | null;
    room?: string | null;
    block?: string | null;
    contact?: string | null;
    notes?: string | null;
  } | null;
  order_items?: {
    id: string;
    product_id?: string | null;
    product_name: string;
    quantity: number;
    unit_price?: number;
    line_total: number;
    line_cost: number;
  }[] | null;
};

type Review = {
  id: string;
  order_id?: string | null;
  created_at: string;
  rating?: number | null;
  comment?: string | null;
  hidden?: boolean | null;
  customers?: { name?: string | null } | null;
  orders?: { status?: string | null } | null;
};

type Expense = {
  id: string;
  name: string;
  category?: string | null;
  amount: number;
  expense_date: string;
  notes?: string | null;
};

type InvItem = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  stock: number;
  low_stock_threshold: number;
  cost_per_unit: number;
  supplier: string | null;
};
type Recipe = { id: string; product_id: string; item_id: string; quantity: number };
type Movement = {
  id: string;
  item_id: string;
  kind: string;
  quantity: number;
  unit_cost: number | null;
  created_by: string | null;
  created_at: string;
};
type AuditRow = {
  id: string;
  created_at: string;
  actor: string | null;
  action: string;
  details: Record<string, unknown> | null;
};

type Settings = {
  id: number;
  is_open: boolean;
  schedule_enabled: boolean;
  store_name: string;
  logo_url: string | null;
  currency: string;
  whatsapp_number: string | null;
  contact_phone: string | null;
  prep_minutes: number;
  opens_at: string | null;
  closes_at: string | null;
  closed_days: number[];
  min_order: number;
  fulfillment: string;
  delivery_fee_default: number;
  notice: string | null;
  banner_text: string | null;
  discount_percent: number;
};

const DEFAULT_SETTINGS: Settings = {
  id: 1,
  is_open: true,
  schedule_enabled: false,
  store_name: "HYFUX MIXBAR",
  logo_url: null,
  currency: "DA",
  whatsapp_number: null,
  contact_phone: null,
  prep_minutes: 15,
  opens_at: null,
  closes_at: null,
  closed_days: [],
  min_order: 0,
  fulfillment: "delivery",
  delivery_fee_default: 0,
  notice: null,
  banner_text: null,
  discount_percent: 0,
};

type ProductForm = {
  id?: string | number;
  name: string;
  price: string;
  cost: string;
  category: string;
  description: string;
  image_url: string;
  available: boolean;
  manual_sold_out: boolean;
  ingredient_sold_out: boolean;
  featured: boolean;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  price: "",
  cost: "",
  category: "",
  description: "",
  image_url: "",
  available: true,
  manual_sold_out: false,
  ingredient_sold_out: false,
  featured: false,
};

const cash = (price: number) =>
  `${Number(price || 0).toLocaleString("fr-DZ")} DA`;

const STATUS_FLOW = ["new", "preparing", "ready", "delivered"] as const;
const STATUS_LABEL: Record<string, string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const shortId = (id: string | number) => String(id).slice(0, 6).toUpperCase();

function whatsappLink(phone?: string | null, text?: string) {
  let digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = "213" + digits.slice(1);
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
function showAdminNotification(title: string, body: string, tag?: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body,
    icon: "/admin-icon-192.png",
    badge: "/admin-icon-192.png",
    tag,
    data: { url: "/admin" },
  };
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.showNotification(title, options))
      .catch(() => {
        try {
          new Notification(title, options);
        } catch {}
      });
    return;
  }
  try {
    new Notification(title, options);
  } catch {}
}

function notifyNewOrder() {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) {
      const ctx = new AC();
      [0, 0.25, 0.5].forEach((t) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.value = 0.2;
        o.connect(g);
        g.connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.15);
      });
    }
  } catch {}
  showAdminNotification("New order! 🍹", "Open the admin panel to accept it.", "new-order");
}

function notifyLowStock(item: Partial<InvItem>) {
  if (!("Notification" in window) || Notification.permission !== "granted" || !item.id) return;
  const key = `hyfux-low-stock-notified-${item.id}`;
  const isLow = Number(item.stock) <= Number(item.low_stock_threshold);
  if (!isLow) {
    window.sessionStorage.removeItem(key);
    return;
  }
  if (window.sessionStorage.getItem(key)) return;
  window.sessionStorage.setItem(key, "1");
  showAdminNotification(
    "Low stock alert",
    `${item.name || "An inventory item"}: ${Number(item.stock)} ${item.unit || "units"} left (alert at ${Number(item.low_stock_threshold)}).`,
    `low-stock-${item.id}`
  );
}

function isToday(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

/* ---------- Icons (same stroke style as the customer store) ---------- */
type IconProps = { size?: number };

function Svg({ size = 20, children }: IconProps & { children?: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const GridIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </Svg>
);

const BagIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 7h14l-1.5 12.5h-11L5 7Z" />
    <path d="M9 7a3 3 0 0 1 6 0" />
  </Svg>
);

const ReceiptIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
    <path d="M9 8h6M9 12h6" />
  </Svg>
);

const StarIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />
  </Svg>
);

const SlidersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Svg>
);

const TrendIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4 16 6-6 4 4 6-8" />
    <path d="M15 6h5v5" />
  </Svg>
);

const ArrowIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

const BackIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
);

const CoinIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M14.8 9.2c-.5-.8-1.5-1.2-2.8-1.2-1.6 0-2.6.7-2.6 1.8 0 2.7 5.4 1.2 5.4 4 0 1.1-1.1 1.9-2.8 1.9-1.4 0-2.5-.5-3-1.4M12 6.5V8m0 8v1.5" />
  </Svg>
);

const UsersIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19c.4-3.2 2.6-5 5.5-5s5.1 1.8 5.5 5" />
    <path d="M16 5.6a3 3 0 0 1 0 5.8M17.5 14.3c1.8.5 3 2 3.3 4.7" />
  </Svg>
);

const BoxIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3.5 8 4v9l-8 4-8-4v-9l8-4Z" />
    <path d="m4 7.5 8 4 8-4M12 11.5v9" />
  </Svg>
);

const ShieldIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 19 6v5.5c0 4.2-2.8 7.4-7 9-4.2-1.6-7-4.8-7-9V6l7-2.5Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Svg>
);

/* HYFUX "HF" mark, same as the customer store */
function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="3 2 42 43.5"
      aria-hidden="true"
      focusable="false"
      className="ad-logo-mark"
    >
      <defs>
        <linearGradient
          id="adMarkTeal"
          gradientUnits="userSpaceOnUse"
          x1="5"
          y1="0"
          x2="25"
          y2="0"
        >
          <stop offset="0" stopColor="#00fff2" />
          <stop offset="0.55" stopColor="#12eee8" />
          <stop offset="1" stopColor="#4fb8c4" />
        </linearGradient>
        <linearGradient
          id="adMarkOrange"
          gradientUnits="userSpaceOnUse"
          x1="25"
          y1="4"
          x2="43"
          y2="40"
        >
          <stop offset="0" stopColor="#ff7a0f" />
          <stop offset="1" stopColor="#f2570a" />
        </linearGradient>
      </defs>
      <path d="M5 3.6 21 11.2 17.2 15.9 4.9 9.6Z" fill="url(#adMarkTeal)" />
      <path
        d="M26.4 11.1 23.9 12.5 21.3 16.2 21 21.2 20.5 22 11.7 17.7 10.7 15.1 5.8 13.1 5 13.3 5.2 42.8 6.3 42.8 11.1 39.5 11.2 25.2 11.9 24.4 20.8 28.6 21.1 42.3 22.3 42.9 24.2 41.8 25 41.3 24.8 20.2Z"
        fill="url(#adMarkTeal)"
      />
      <path
        d="M42.7 3.7 31.6 8.1 27 10.8 24.8 20.2 25 41.3 26.9 40.8 28.3 39.2 28.6 28.2 38.2 23.7 39.6 22.2 38.8 19.1 37.7 18.2 28.5 21.6 28 20.8 28.4 17.4 30.4 15.4 42.7 10 43.2 5Z"
        fill="url(#adMarkOrange)"
      />
    </svg>
  );
}

function Logo() {
  return (
    <a href="/" className="ad-logo" aria-label="HYFUX MIXBAR store">
      <LogoMark />
      <span className="ad-logo-text">
        <span className="ad-logo-name">HYFUX</span>
        <span className="ad-logo-sub">MIXBAR</span>
      </span>
    </a>
  );
}

/* ---------- Styles (original design + a few classes for new controls) ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@500;600;700;800;900&family=Yellowtail&display=swap');

:root {
  --teal: #00f0e6;
  --orange: #ff4d06;
  --bg: #03080b;
  --muted: #9db0b7;
  --line: rgba(0, 240, 230, 0.22);
  --grad: linear-gradient(100deg, #00f0e6 0%, #3dffb0 26%, #ffe45c 58%, #ff8a1f 80%, #ff4d06 100%);
  --font-display: 'Montserrat', 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-script: 'Yellowtail', 'Brush Script MT', cursive;
  color-scheme: dark;
}

*, *::before, *::after { box-sizing: border-box; }

html, body { margin: 0; background: var(--bg); }

body {
  color: #f4f8fa;
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; text-decoration: none; }
button { font: inherit; color: inherit; }
h1, h2, h3, p { margin: 0; }
:focus-visible { outline: 2px solid var(--teal); outline-offset: 3px; }

.ad-gradient-text {
  display: inline-block;
  padding-right: 0.04em;
  background: var(--grad);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
}

/* ---------- Shell ---------- */
.ad-shell {
  min-height: 100vh;
  display: flex;
  background:
    radial-gradient(50% 40% at 85% 0%, rgba(0, 240, 230, 0.1), transparent 70%),
    radial-gradient(40% 40% at 100% 60%, rgba(255, 77, 6, 0.08), transparent 70%),
    var(--bg);
}

/* ---------- Sidebar ---------- */
.ad-sidebar {
  position: sticky;
  top: 0;
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  flex: none;
  width: 264px;
  height: 100vh;
  overflow-y: auto;
  padding: 26px 18px 22px;
  border-right: 1px solid rgba(0, 240, 230, 0.16);
  background: linear-gradient(180deg, #07151b, #040c10);
}

.ad-logo { display: inline-flex; align-items: center; gap: 12px; padding: 0 6px; }
.ad-logo-mark { flex: none; filter: drop-shadow(0 0 12px rgba(0, 240, 230, 0.22)); }
.ad-logo-text { display: flex; flex-direction: column; align-items: center; line-height: 1; }
.ad-logo-name {
  font-family: var(--font-display);
  font-size: 23px;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: #fff;
}
.ad-logo-sub {
  margin-top: 7px;
  padding-left: 0.6em;
  font-family: var(--font-display);
  font-size: 8.5px;
  font-weight: 500;
  letter-spacing: 0.6em;
  color: #dbe6ea;
}

.ad-label {
  margin: 28px 10px 12px;
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.26em;
  color: var(--teal);
}

.ad-nav { display: grid; gap: 8px; }
.ad-menu-btn {
  display: none;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 14px;
  padding: 11px 16px;
  border-radius: 999px;
  border: 1px solid var(--teal);
  background: rgba(0, 240, 230, 0.07);
  color: var(--teal);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}
.ad-menu-order-count {
  margin-left: 8px;
  margin-right: 10px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 77, 6, 0.18);
  border: 1px solid rgba(255, 77, 6, 0.55);
  color: #ff9b72;
  font-size: 9px;
  letter-spacing: 0.08em;
}
.ad-menu-low-count {
  margin-left: 8px;
  margin-right: 10px;
  padding: 4px 6px;
  border-radius: 999px;
  background: rgba(0, 240, 230, 0.1);
  border: 1px solid rgba(0, 240, 230, 0.4);
  color: var(--teal);
  font-size: 8px;
  letter-spacing: 0.04em;
}

.ad-nav-item {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 11px 16px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: #b9c9ce;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}
.ad-menu-btn > span:first-child { flex: 1; text-align: left; }
.ad-nav-item:hover { color: #fff; border-color: rgba(0, 240, 230, 0.28); }
.ad-nav-item.active {
  color: var(--teal);
  border-color: var(--teal);
  background: rgba(0, 240, 230, 0.07);
  box-shadow: 0 0 22px rgba(0, 240, 230, 0.16), inset 0 0 14px rgba(0, 240, 230, 0.06);
}

.ad-nav-tag {
  margin-left: auto;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(255, 77, 6, 0.14);
  border: 1px solid rgba(255, 77, 6, 0.5);
  color: #ff8a5c;
  font-size: 8px;
  letter-spacing: 0.12em;
}
.ad-nav-tag.low {
  background: rgba(0, 240, 230, 0.1);
  border-color: rgba(0, 240, 230, 0.4);
  color: var(--teal);
}

.ad-sidebar-bottom {
  margin-top: auto;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  gap: 14px;
}

.ad-conn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  width: fit-content;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid currentColor;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #ffcf7b;
}
.ad-conn.online { color: var(--teal); box-shadow: 0 0 20px rgba(0, 240, 230, 0.16); }

.ad-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: adPulse 2s ease-out infinite;
}

.ad-store-link {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  font-weight: 600;
  color: #c8d5da;
  transition: color 0.2s ease;
}
.ad-store-link:hover { color: var(--teal); }

/* ---------- Main ---------- */
.ad-main {
  flex: 1;
  min-width: 0;
  padding: 28px clamp(18px, 3.6vw, 52px) 22px;
}

.ad-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 28px;
}

.ad-eyebrow {
  font-family: var(--font-display);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--teal);
}

.ad-title {
  margin-top: 10px;
  font-family: var(--font-display);
  font-size: clamp(26px, 3.4vw, 38px);
  font-weight: 900;
  line-height: 1.05;
  text-transform: uppercase;
}

.ad-top-right { display: flex; align-items: center; gap: 14px; }

.ad-status {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--teal);
  color: var(--teal);
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 0 22px rgba(0, 240, 230, 0.18);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.ad-status.closed {
  border-color: var(--orange);
  color: #ff8a5c;
  box-shadow: 0 0 22px rgba(255, 77, 6, 0.2);
}

.ad-avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid var(--teal);
  background: rgba(0, 240, 230, 0.06);
  box-shadow: 0 0 18px rgba(0, 240, 230, 0.22);
  font-family: var(--font-display);
  font-weight: 900;
  color: var(--teal);
}

/* ---------- Welcome card ---------- */
.ad-welcome {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 220px;
  padding: 32px 36px;
  margin-bottom: 34px;
  border-radius: 22px;
  border: 1px solid rgba(0, 240, 230, 0.28);
  background:
    radial-gradient(45% 90% at 92% 20%, rgba(0, 240, 230, 0.18), transparent 70%),
    radial-gradient(35% 70% at 100% 100%, rgba(255, 77, 6, 0.2), transparent 70%),
    linear-gradient(115deg, #08181f, #050d11 75%);
}

.ad-chip {
  display: inline-block;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid rgba(0, 240, 230, 0.5);
  background: rgba(0, 240, 230, 0.07);
  color: var(--teal);
  font-family: var(--font-display);
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.2em;
}

.ad-welcome h2 {
  margin-top: 18px;
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 46px);
  font-weight: 900;
  line-height: 1.02;
  text-transform: uppercase;
}

.ad-welcome p {
  max-width: 420px;
  margin-top: 14px;
  font-size: 14px;
  line-height: 1.7;
  color: #d3dfe3;
}

.ad-welcome-mark {
  position: relative;
  flex: none;
  padding-right: 30px;
  opacity: 0.95;
}
.ad-welcome-mark::before {
  content: '';
  position: absolute;
  inset: -20%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 240, 230, 0.22), rgba(255, 77, 6, 0.1) 55%, transparent 72%);
  filter: blur(26px);
}
.ad-welcome-mark svg { position: relative; }

/* ---------- Section heading ---------- */
.ad-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.ad-section-heading h2 {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ad-section-heading p { margin-top: 6px; font-size: 13px; color: var(--muted); }

.ad-date {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(0, 240, 230, 0.3);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #b6c7cd;
}

/* ---------- Stat cards ---------- */
.ad-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 26px;
}

.ad-card {
  border-radius: 18px;
  border: 1px solid rgba(0, 240, 230, 0.22);
  background: linear-gradient(180deg, #081a21, #060f14);
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.ad-stat { padding: 20px; min-width: 0; }
.ad-stat:hover {
  transform: translateY(-4px);
  border-color: rgba(0, 240, 230, 0.6);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45), 0 0 28px rgba(0, 240, 230, 0.12);
}

.ad-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 50%;
  border: 1.5px solid var(--teal);
  color: var(--teal);
  background: rgba(0, 240, 230, 0.05);
  box-shadow: 0 0 18px rgba(0, 240, 230, 0.22);
}
.ad-icon.orange {
  border-color: var(--orange);
  color: #ff7a4a;
  background: rgba(255, 77, 6, 0.06);
  box-shadow: 0 0 18px rgba(255, 77, 6, 0.22);
}

.ad-stat p {
  margin: 18px 0 8px;
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #b6c7cd;
}
.ad-stat strong {
  display: block;
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
  overflow-wrap: anywhere;
}
.ad-stat small { display: block; margin-top: 10px; font-size: 11.5px; line-height: 1.5; color: var(--muted); }

/* ---------- Panels ---------- */
.ad-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 20px;
}

.ad-panel { padding: 22px; min-width: 0; }

.ad-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 18px;
}
.ad-panel-heading h3 { font-size: 16px; font-weight: 700; }
.ad-panel-heading p { margin-top: 5px; font-size: 12.5px; color: var(--muted); }

.ad-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 999px;
  border: 1px solid var(--teal);
  background: transparent;
  color: var(--teal);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}
.ad-link-btn:hover { background: rgba(0, 240, 230, 0.1); box-shadow: 0 0 22px rgba(0, 240, 230, 0.2); }
.ad-link-btn.danger { border-color: var(--orange); color: #ff8a5c; }
.ad-link-btn.danger:hover { background: rgba(255, 77, 6, 0.1); box-shadow: 0 0 22px rgba(255, 77, 6, 0.2); }
.ad-link-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.ad-product-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.ad-product-row:last-child { border-bottom: 0; }

.ad-thumb {
  display: grid;
  place-items: center;
  flex: none;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid rgba(0, 240, 230, 0.3);
  background: #0a1f26;
  color: var(--teal);
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 900;
}
.ad-thumb img { width: 100%; height: 100%; object-fit: cover; }

.ad-product-info { flex: 1; min-width: 0; }
.ad-product-info strong { display: block; font-size: 13.5px; font-weight: 600; overflow-wrap: anywhere; }
.ad-product-info small { display: block; margin-top: 4px; font-size: 11px; color: var(--muted); }

.ad-hidden-tag {
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 77, 6, 0.5);
  color: #ff8a5c;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.ad-hidden-tag.ok { border-color: rgba(0, 240, 230, 0.5); color: var(--teal); }

.ad-price {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 800;
  color: var(--teal);
  white-space: nowrap;
}

.ad-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 160px;
  padding: 24px;
  border-radius: 14px;
  border: 1px dashed rgba(0, 240, 230, 0.3);
  text-align: center;
  font-size: 13px;
  line-height: 1.6;
  color: var(--muted);
}
.ad-empty strong { color: #fff; font-size: 15px; }
.ad-empty p { max-width: 320px; }

.ad-actions { display: grid; gap: 10px; }
.ad-action {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(0, 240, 230, 0.2);
  background: rgba(0, 240, 230, 0.03);
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.ad-action:hover {
  transform: translateX(4px);
  border-color: var(--teal);
  box-shadow: 0 0 24px rgba(0, 240, 230, 0.14);
}
.ad-action div { flex: 1; min-width: 0; }
.ad-action strong { display: block; font-size: 13px; font-weight: 700; }
.ad-action small { display: block; margin-top: 4px; font-size: 11.5px; color: var(--muted); }
.ad-action .ad-arrow { color: var(--teal); }

.ad-notice {
  margin-top: 20px;
  padding: 16px 20px;
  border-radius: 14px;
  border: 1px solid rgba(255, 77, 6, 0.45);
  background: rgba(255, 77, 6, 0.08);
  color: #ffd9c9;
  font-size: 13.5px;
  line-height: 1.6;
}
.ad-notice strong { display: block; margin-bottom: 4px; }
.ad-notice.good {
  border-color: rgba(0, 240, 230, 0.45);
  background: rgba(0, 240, 230, 0.07);
  color: #d4fffc;
}

.ad-placeholder {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  min-height: 280px;
  padding: 34px;
  background:
    radial-gradient(40% 80% at 95% 10%, rgba(0, 240, 230, 0.1), transparent 70%),
    linear-gradient(180deg, #081a21, #060f14);
}
.ad-placeholder h2 {
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 900;
  text-transform: uppercase;
}
.ad-placeholder p { max-width: 520px; font-size: 14px; line-height: 1.7; color: #c3d2d7; }

.ad-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 999px;
  border: 1px solid var(--teal);
  background: var(--teal);
  color: #021012;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 10px 32px rgba(0, 240, 230, 0.28);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.ad-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 40px rgba(0, 240, 230, 0.42); }
.ad-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

/* ---------- Forms, switches, tabs, orders ---------- */
.ad-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.ad-field { display: grid; gap: 7px; min-width: 0; }
.ad-field.full { grid-column: 1 / -1; }
.ad-field > span {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #b6c7cd;
}
.ad-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid rgba(0, 240, 230, 0.25);
  background: rgba(0, 240, 230, 0.03);
  color: #f4f8fa;
  font: inherit;
  font-size: 13.5px;
}
.ad-input:focus { outline: none; border-color: var(--teal); box-shadow: 0 0 18px rgba(0, 240, 230, 0.16); }
textarea.ad-input { min-height: 84px; resize: vertical; }

.ad-toggles { display: flex; flex-wrap: wrap; gap: 10px; }
.ad-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border-radius: 999px;
  border: 1px solid rgba(0, 240, 230, 0.25);
  font-size: 12px;
  font-weight: 600;
  color: #c8d5da;
  cursor: pointer;
}
.ad-check input { accent-color: #00f0e6; }

.ad-form-actions { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }

.ad-switch {
  position: relative;
  flex: none;
  width: 56px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid var(--orange);
  background: rgba(255, 77, 6, 0.1);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.ad-switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ff8a5c;
  transition: transform 0.2s ease, background 0.2s ease;
}
.ad-switch.on { border-color: var(--teal); background: rgba(0, 240, 230, 0.12); }
.ad-switch.on::after { transform: translateX(26px); background: var(--teal); }

.ad-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  margin-bottom: 18px;
  border-radius: 16px;
  border: 1px solid rgba(0, 240, 230, 0.2);
  background: rgba(0, 240, 230, 0.03);
}
.ad-switch-row strong { display: block; font-size: 14px; }
.ad-switch-row small { display: block; margin-top: 4px; font-size: 12px; color: var(--muted); }

.ad-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.ad-tab {
  padding: 9px 16px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: #b9c9ce;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}
.ad-tab:hover { color: #fff; border-color: rgba(0, 240, 230, 0.28); }
.ad-tab.active { color: var(--teal); border-color: var(--teal); background: rgba(0, 240, 230, 0.07); }

.ad-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 18px; }
.ad-toolbar .ad-input { max-width: 320px; }

.ad-order {
  display: grid;
  gap: 12px;
  padding: 18px;
  margin-bottom: 14px;
  border-radius: 16px;
  border: 1px solid rgba(0, 240, 230, 0.2);
  background: rgba(0, 240, 230, 0.03);
}
.ad-order.is-new { border-color: var(--orange); box-shadow: 0 0 24px rgba(255, 77, 6, 0.14); }
.ad-order-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.ad-order-head strong { font-family: var(--font-display); font-size: 15px; font-weight: 800; }
.ad-order-meta { font-size: 12.5px; line-height: 1.7; color: #c3d2d7; }
.ad-order-meta b { color: #fff; font-weight: 600; }
.ad-order-items { display: grid; gap: 4px; font-size: 13px; padding: 10px 0; border-top: 1px solid rgba(255, 255, 255, 0.07); border-bottom: 1px solid rgba(255, 255, 255, 0.07); }
.ad-order-items div { display: flex; justify-content: space-between; gap: 12px; }
.ad-order-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.ad-order-btns { display: flex; flex-wrap: wrap; gap: 8px; }

.ad-badge {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--teal);
  color: var(--teal);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.ad-badge.new, .ad-badge.rejected, .ad-badge.cancelled { border-color: var(--orange); color: #ff8a5c; }
.ad-badge.preparing { border-color: #ffe45c; color: #ffe45c; }

.ad-stars { color: #ffe45c; letter-spacing: 2px; font-size: 14px; }

/* ---------- Login ---------- */
.ad-login-wrap { flex: 1; display: grid; place-items: center; padding: 24px 16px; }
.ad-login { width: min(420px, 100%); padding: 34px 30px; display: grid; gap: 18px; }
.ad-login .ad-logo { justify-self: center; margin-bottom: 6px; }
.ad-login h1 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 900;
  text-transform: uppercase;
  text-align: center;
}
.ad-login p.sub { text-align: center; font-size: 13px; color: var(--muted); }

/* ---------- Charts, tables, layout helpers ---------- */
.ad-stack { display: grid; gap: 20px; min-width: 0; }
.ad-stats.auto { grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); margin-bottom: 0; }
.ad-row-inline { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.ad-bars { display: grid; gap: 12px; }
.ad-bar-row { display: grid; grid-template-columns: minmax(70px, 130px) 1fr auto; align-items: center; gap: 12px; font-size: 12.5px; color: #c3d2d7; }
.ad-bar-row b { font-family: var(--font-display); font-weight: 800; color: #fff; }
.ad-bar-track { height: 10px; border-radius: 999px; background: rgba(0, 240, 230, 0.08); overflow: hidden; }
.ad-bar-fill { height: 100%; border-radius: 999px; background: var(--grad); }
.ad-cols { display: flex; align-items: flex-end; gap: 6px; height: 170px; padding-top: 10px; overflow-x: auto; }
.ad-col { flex: 1; min-width: 14px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; }
.ad-col-bar { width: 100%; min-height: 2px; border-radius: 6px 6px 0 0; background: linear-gradient(180deg, #00f0e6, #ff4d06); }
.ad-col small { font-size: 9.5px; color: var(--muted); white-space: nowrap; }
.ad-table-wrap { overflow-x: auto; }
.ad-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ad-table th { text-align: left; padding: 10px 12px; font-family: var(--font-display); font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #b6c7cd; border-bottom: 1px solid rgba(0, 240, 230, 0.2); white-space: nowrap; }
.ad-table td { padding: 11px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); white-space: nowrap; }
.ad-pos { color: var(--teal); }
.ad-neg { color: #ff8a5c; }
select.ad-input { appearance: none; }
select.ad-input option { background: #07151b; color: #f4f8fa; }

/* ---------- Footer ---------- */
.ad-footer { margin-top: 38px; }
.ad-tagline {
  display: flex;
  align-items: center;
  gap: 18px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--teal);
  white-space: nowrap;
}
.ad-tagline::before, .ad-tagline::after { content: ''; flex: 1; height: 1px; }
.ad-tagline::before { background: linear-gradient(90deg, var(--teal), rgba(0, 240, 230, 0.05)); }
.ad-tagline::after { background: linear-gradient(90deg, rgba(255, 77, 6, 0.05), var(--orange)); }
.ad-copy { margin-top: 14px; font-size: 11px; color: #8da0a7; text-align: center; }

@keyframes adPulse {
  0% { box-shadow: 0 0 0 0 currentColor; }
  70% { box-shadow: 0 0 0 9px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}

/* ---------- Responsive ---------- */
@media (max-width: 1050px) {
  .ad-sidebar { width: 220px; }
  .ad-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ad-grid { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 800px) {
  .ad-shell { display: block; }
  .ad-sidebar {
    position: static;
    width: 100%;
    height: auto;
    padding: 14px 16px;
    border-right: 0;
    border-bottom: 1px solid rgba(0, 240, 230, 0.16);
  }
  .ad-label, .ad-sidebar-bottom { display: none; }
  .ad-menu-btn { display: flex; }
  .ad-nav { display: none; margin-top: 12px; gap: 6px; }
  .ad-nav.open { display: grid; }
  .ad-nav-item { width: 100%; }
  .ad-main { padding: 22px 16px 20px; }
  .ad-status { display: none; }
  .ad-welcome { padding: 26px 22px; min-height: 0; }
  .ad-welcome-mark, .ad-date { display: none; }
  .ad-stats { gap: 12px; }
  .ad-stat { padding: 16px; }
  .ad-stat strong { font-size: 26px; }
  .ad-tagline { letter-spacing: 0.18em; font-size: 9px; gap: 10px; }
  .ad-form { grid-template-columns: minmax(0, 1fr); }
  .ad-login-wrap { min-height: 100vh; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
`;

function Styles() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}

/* ====================================================================== */
/* Shared helpers                                                          */
/* ====================================================================== */

const isDone = (o: Order) => DONE_STATUSES.includes(o.status ?? "");
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const orderCost = (o: Order) =>
  sum((o.order_items ?? []).map((i) => Number(i.line_cost) || 0));
const orderTotal = (o: Order) => Number(o.total) || 0;
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

function eachDay(start: Date, end: Date) {
  const out: Date[] = [];
  for (let d = new Date(start); d < end && out.length < 93; d = addDays(d, 1)) {
    out.push(new Date(d));
  }
  return out;
}

type Preset = "today" | "week" | "month" | "custom";

function useRange(initial: Preset) {
  const [preset, setPreset] = useState<Preset>(initial);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { start, end } = useMemo(() => {
    const today = startOfDay(new Date());
    let start = addDays(today, -6);
    let end = addDays(today, 1);
    if (preset === "today") start = today;
    else if (preset === "month")
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    else if (preset === "custom" && from && to) {
      const a = new Date(`${from}T00:00:00`);
      const b = addDays(new Date(`${to}T00:00:00`), 1);
      if (!isNaN(a.getTime()) && !isNaN(b.getTime()) && b > a) {
        start = a;
        end = b;
      }
    }
    return { start, end };
  }, [preset, from, to]);
  return { preset, setPreset, from, setFrom, to, setTo, start, end };
}
type Range = ReturnType<typeof useRange>;

function RangeBar({ r }: { r: Range }) {
  const tabs: [Preset, string][] = [
    ["today", "Today"],
    ["week", "Last 7 days"],
    ["month", "This month"],
    ["custom", "Custom dates"],
  ];
  return (
    <div className="ad-toolbar">
      <div className="ad-tabs" style={{ marginBottom: 0 }}>
        {tabs.map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={r.preset === k ? "ad-tab active" : "ad-tab"}
            onClick={() => r.setPreset(k)}
          >
            {label}
          </button>
        ))}
      </div>
      {r.preset === "custom" && (
        <div className="ad-row-inline">
          <input
            className="ad-input"
            style={{ maxWidth: 170 }}
            type="date"
            aria-label="From date"
            value={r.from}
            onChange={(e) => r.setFrom(e.target.value)}
          />
          <input
            className="ad-input"
            style={{ maxWidth: 170 }}
            type="date"
            aria-label="To date"
            value={r.to}
            onChange={(e) => r.setTo(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadCsv(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  downloadFile(
    name,
    "\ufeff" + rows.map((r) => r.map(esc).join(",")).join("\n"),
    "text/csv;charset=utf-8"
  );
}

type BarRow = { label: string; value: number };

function HBars({ rows, fmt }: { rows: BarRow[]; fmt?: (n: number) => string }) {
  if (rows.length === 0) return <div className="ad-empty">No data for this period.</div>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="ad-bars">
      {rows.map((r) => (
        <div className="ad-bar-row" key={r.label}>
          <span title={r.label} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.label}
          </span>
          <div className="ad-bar-track">
            <div className="ad-bar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <b>{fmt ? fmt(r.value) : r.value}</b>
        </div>
      ))}
    </div>
  );
}

function VBars({ rows, fmt }: { rows: BarRow[]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="ad-cols" role="img" aria-label="Bar chart">
      {rows.map((r) => (
        <div className="ad-col" key={r.label} title={`${r.label}: ${fmt ? fmt(r.value) : r.value}`}>
          <div className="ad-col-bar" style={{ height: `${(r.value / max) * 100}%` }} />
          <small>{r.label}</small>
        </div>
      ))}
    </div>
  );
}

function Stat({
  icon,
  orange,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  orange?: boolean;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <article className="ad-card ad-stat">
      <span className={orange ? "ad-icon orange" : "ad-icon"}>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}

function Panel({
  title,
  sub,
  action,
  children,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="ad-card ad-panel">
      <div className="ad-panel-heading">
        <div>
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </article>
  );
}

/* ====================================================================== */
/* Analytics                                                               */
/* ====================================================================== */

function Analytics({ orders, products }: { orders: Order[]; products: Product[] }) {
  const r = useRange("week");

  const m = useMemo(() => {
    const inRange = orders.filter((o) => {
      const t = new Date(o.created_at);
      return t >= r.start && t < r.end;
    });
    const done = inRange.filter(isDone);
    const sales = sum(done.map(orderTotal));

    const catOf = new Map(products.map((p) => [String(p.id), p.category || "Uncategorized"]));
    const drinks = new Map<string, { qty: number; revenue: number }>();
    const cats = new Map<string, number>();
    done.forEach((o) =>
      (o.order_items ?? []).forEach((i) => {
        const d = drinks.get(i.product_name) ?? { qty: 0, revenue: 0 };
        d.qty += i.quantity;
        d.revenue += Number(i.line_total) || 0;
        drinks.set(i.product_name, d);
        const c = (i.product_id && catOf.get(String(i.product_id))) || "Uncategorized";
        cats.set(c, (cats.get(c) ?? 0) + i.quantity);
      })
    );

    const days = eachDay(r.start, r.end).map((d) => ({
      key: dayKey(d),
      label: dayKey(d).slice(5),
      value: 0,
    }));
    const byKey = new Map(days.map((d) => [d.key, d]));
    const hours = Array.from({ length: 24 }, (_, h) => ({ label: String(h), value: 0 }));
    done.forEach((o) => {
      const t = new Date(o.created_at);
      const d = byKey.get(dayKey(t));
      if (d) d.value += orderTotal(o);
      hours[t.getHours()].value += orderTotal(o);
    });

    const perCustomer = new Map<string, number>();
    done.forEach((o) => {
      if (o.customer_id) perCustomer.set(o.customer_id, (perCustomer.get(o.customer_id) ?? 0) + 1);
    });
    const before = new Set(
      orders
        .filter((o) => isDone(o) && o.customer_id && new Date(o.created_at) < r.start)
        .map((o) => o.customer_id as string)
    );
    const returning = Array.from(perCustomer.entries()).filter(
      ([id, n]) => n >= 2 || before.has(id)
    ).length;

    return {
      inRange,
      done,
      sales,
      aov: done.length ? sales / done.length : 0,
      drinks: Array.from(drinks.entries())
        .sort((a, b) => b[1].qty - a[1].qty)
        .slice(0, 8)
        .map(([label, v]) => ({ label, value: v.qty })),
      cats: Array.from(cats.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value })),
      days,
      hours,
      customers: perCustomer.size,
      returning,
    };
  }, [orders, products, r.start, r.end]);

  function exportCsv() {
    downloadCsv(`hyfux-orders-${dayKey(r.start)}.csv`, [
      ["Order", "Date", "Customer", "Room", "Status", "Total", "Cost", "Refund"],
      ...m.inRange.map((o) => [
        shortId(o.id),
        new Date(o.created_at).toLocaleString("fr-DZ"),
        o.customers?.name ?? "",
        o.customers?.room ?? "",
        o.status ?? "",
        orderTotal(o),
        orderCost(o),
        Number(o.refund_amount) || 0,
      ]),
    ]);
  }

  return (
    <div className="ad-stack">
      <div className="ad-toolbar" style={{ marginBottom: 0, justifyContent: "space-between" }}>
        <RangeBar r={r} />
        <button type="button" className="ad-link-btn" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <div className="ad-stats auto">
        <Stat icon={<ReceiptIcon size={20} />} orange label="TOTAL ORDERS" value={m.inRange.length} hint={`${m.done.length} completed`} />
        <Stat icon={<TrendIcon size={20} />} label="SALES" value={cash(m.sales)} hint="Completed orders only" />
        <Stat icon={<CoinIcon size={20} />} orange label="AVERAGE ORDER" value={cash(Math.round(m.aov))} />
        <Stat
          icon={<UsersIcon size={20} />}
          label="REPEAT CUSTOMERS"
          value={m.customers ? `${Math.round((m.returning / m.customers) * 100)}%` : "—"}
          hint={`${m.returning} of ${m.customers} customers`}
        />
      </div>

      <div className="ad-grid">
        <Panel title="Sales by day" sub="Completed orders">
          <VBars rows={m.days} fmt={cash} />
        </Panel>
        <Panel title="Sales by hour" sub="Which hours bring in money">
          <VBars rows={m.hours} fmt={cash} />
        </Panel>
      </div>

      <div className="ad-grid">
        <Panel title="Most popular drinks" sub="Cups sold">
          <HBars rows={m.drinks} />
        </Panel>
        <Panel title="Popular categories" sub="Cups sold">
          <HBars rows={m.cats} />
        </Panel>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* Finance & Profit                                                        */
/* ====================================================================== */

function Finance({
  orders,
  expenses,
  onChange,
  onError,
}: {
  orders: Order[];
  expenses: Expense[];
  onChange: () => void;
  onError: (m: string) => void;
}) {
  const r = useRange("month");
  const [form, setForm] = useState({
    name: "",
    category: "",
    amount: "",
    expense_date: dayKey(new Date()),
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const m = useMemo(() => {
    const inRange = orders.filter((o) => {
      const t = new Date(o.created_at);
      return t >= r.start && t < r.end;
    });
    const done = inRange.filter(isDone);
    const lost = inRange.filter((o) => ["rejected", "cancelled"].includes(o.status ?? ""));
    const startKey = dayKey(r.start);
    const endKey = dayKey(r.end);
    const exp = expenses.filter((e) => e.expense_date >= startKey && e.expense_date < endKey);

    const revenue = sum(done.map(orderTotal));
    const cogs = sum(done.map(orderCost));
    const refunds = sum(done.map((o) => Number(o.refund_amount) || 0));
    const discounts = sum(done.map((o) => Number(o.discount) || 0));
    const other = sum(exp.map((e) => Number(e.amount) || 0));
    const gross = revenue - cogs - refunds;

    const days = eachDay(r.start, r.end).map((d) => {
      const k = dayKey(d);
      const od = done.filter((o) => dayKey(new Date(o.created_at)) === k);
      const rev = sum(od.map(orderTotal));
      const cost = sum(od.map(orderCost));
      const ref = sum(od.map((o) => Number(o.refund_amount) || 0));
      const ex = sum(exp.filter((e) => e.expense_date === k).map((e) => Number(e.amount) || 0));
      return { k, rev, cost, ref, ex, net: rev - cost - ref - ex };
    });

    return {
      exp,
      revenue,
      cogs,
      refunds,
      discounts,
      other,
      gross,
      net: gross - other,
      lostCount: lost.length,
      lostValue: sum(lost.map(orderTotal)),
      days,
    };
  }, [orders, expenses, r.start, r.end]);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.name.trim() || !isFinite(amount) || amount < 0) {
      onError("Enter an expense name and a valid amount.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from(T_EXPENSES).insert({
      name: form.name.trim(),
      category: form.category.trim() || null,
      amount,
      expense_date: form.expense_date,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      onError(`Could not save the expense: ${error.message}`);
      return;
    }
    setForm({ ...form, name: "", amount: "", notes: "" });
    onChange();
  }

  async function removeExpense(e: Expense) {
    if (!window.confirm(`Delete expense "${e.name}"?`)) return;
    const { error } = await supabase.from(T_EXPENSES).delete().eq("id", e.id);
    if (error) onError(`Could not delete the expense: ${error.message}`);
    else onChange();
  }

  function exportCsv() {
    downloadCsv(`hyfux-profit-${dayKey(r.start)}.csv`, [
      ["Date", "Revenue", "Ingredient cost", "Refunds", "Expenses", "Net profit"],
      ...m.days.map((d) => [d.k, d.rev, d.cost, d.ref, d.ex, d.net]),
      ["TOTAL", m.revenue, m.cogs, m.refunds, m.other, m.net],
    ]);
  }

  const tone = (n: number) => (n < 0 ? "ad-neg" : "ad-pos");

  return (
    <div className="ad-stack">
      <div className="ad-toolbar" style={{ marginBottom: 0, justifyContent: "space-between" }}>
        <RangeBar r={r} />
        <button type="button" className="ad-link-btn" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <div className="ad-stats auto">
        <Stat icon={<TrendIcon size={20} />} label="REVENUE" value={cash(m.revenue)} hint="Completed orders" />
        <Stat icon={<BagIcon size={20} />} orange label="INGREDIENT COST" value={cash(m.cogs)} hint="Recorded on each order" />
        <Stat icon={<CoinIcon size={20} />} label="GROSS PROFIT" value={<span className={tone(m.gross)}>{cash(m.gross)}</span>} hint="Revenue − costs − refunds" />
        <Stat icon={<ReceiptIcon size={20} />} orange label="OTHER EXPENSES" value={cash(m.other)} hint="Cups, stickers, supplies…" />
        <Stat icon={<TrendIcon size={20} />} label="NET PROFIT" value={<span className={tone(m.net)}>{cash(m.net)}</span>} hint="Estimated, from recorded data" />
        <Stat
          icon={<ReceiptIcon size={20} />}
          orange
          label="LOST ORDERS"
          value={m.lostCount}
          hint={`${cash(m.lostValue)} cancelled/rejected · ${cash(m.refunds)} refunded · ${cash(m.discounts)} discounts`}
        />
      </div>

      <Panel title="Add an expense" sub="Anything you paid for that is not an ingredient on a drink.">
        <form className="ad-form" onSubmit={addExpense}>
          <label className="ad-field">
            <span>Name</span>
            <input className="ad-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="ad-field">
            <span>Category</span>
            <input className="ad-input" placeholder="Cups, stickers, supplies…" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </label>
          <label className="ad-field">
            <span>Amount (DA)</span>
            <input className="ad-input" type="number" min="0" step="any" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label className="ad-field">
            <span>Date</span>
            <input className="ad-input" type="date" required value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          </label>
          <label className="ad-field full">
            <span>Notes</span>
            <input className="ad-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <div className="ad-form-actions">
            <button className="ad-btn" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save expense"}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Expenses in this period" sub={`${m.exp.length} recorded`}>
        {m.exp.length === 0 ? (
          <div className="ad-empty">No expenses recorded for this period.</div>
        ) : (
          m.exp.map((e) => (
            <div className="ad-product-row" key={e.id}>
              <div className="ad-product-info">
                <strong>{e.name}</strong>
                <small>
                  {e.expense_date} · {e.category || "No category"}
                  {e.notes ? ` · ${e.notes}` : ""}
                </small>
              </div>
              <span className="ad-price">{cash(Number(e.amount) || 0)}</span>
              <button type="button" className="ad-link-btn danger" onClick={() => removeExpense(e)}>
                Delete
              </button>
            </div>
          ))
        )}
      </Panel>

      <Panel title="Daily profit" sub="Calculated from completed orders and recorded costs">
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Revenue</th>
                <th>Cost</th>
                <th>Refunds</th>
                <th>Expenses</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {m.days.map((d) => (
                <tr key={d.k}>
                  <td>{d.k}</td>
                  <td>{cash(d.rev)}</td>
                  <td>{cash(d.cost)}</td>
                  <td>{cash(d.ref)}</td>
                  <td>{cash(d.ex)}</td>
                  <td className={tone(d.net)}>{cash(d.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ====================================================================== */
/* Customers                                                               */
/* ====================================================================== */

function Customers({
  orders,
  onChange,
  onError,
}: {
  orders: Order[];
  onChange: () => void;
  onError: (m: string) => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const list = useMemo(() => {
    type C = {
      id: string;
      name: string;
      room: string;
      contact: string;
      notes: string;
      orders: number;
      done: number;
      spent: number;
      last: string;
      drinks: Map<string, number>;
    };
    const map = new Map<string, C>();
    orders.forEach((o) => {
      if (!o.customer_id) return;
      const c =
        map.get(o.customer_id) ??
        ({
          id: o.customer_id,
          name: o.customers?.name ?? "Customer",
          room: o.customers?.room ?? "",
          contact: o.customers?.contact ?? "",
          notes: o.customers?.notes ?? "",
          orders: 0,
          done: 0,
          spent: 0,
          last: o.created_at,
          drinks: new Map<string, number>(),
        } as C);
      c.orders += 1;
      if (o.created_at > c.last) c.last = o.created_at;
      if (isDone(o)) {
        c.done += 1;
        c.spent += orderTotal(o);
        (o.order_items ?? []).forEach((i) =>
          c.drinks.set(i.product_name, (c.drinks.get(i.product_name) ?? 0) + i.quantity)
        );
      }
      map.set(o.customer_id, c);
    });
    return Array.from(map.values()).sort((a, b) => b.spent - a.spent);
  }, [orders]);

  const shown = list.filter((c) => {
    const text = `${c.name} ${c.room} ${c.contact}`.toLowerCase();
    if (q.trim() && !text.includes(q.trim().toLowerCase())) return false;
    if (filter === "first") return c.done <= 1;
    if (filter === "repeat") return c.done >= 2;
    return true;
  });

  async function editNote(c: { id: string; notes: string; name: string }) {
    const note = window.prompt(`Note about ${c.name}`, c.notes);
    if (note === null) return;
    const { error } = await supabase
      .from("customers")
      .update({ notes: note.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", c.id);
    if (error) onError(`Could not save the note: ${error.message}`);
    else onChange();
  }

  return (
    <Panel title="Customer database" sub={`${list.length} customers · contact details are visible to admins only`}>
      <div className="ad-toolbar">
        <input className="ad-input" placeholder="Search name, room or contact" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="ad-tabs" style={{ marginBottom: 0 }}>
          {[
            ["all", "All"],
            ["first", "First-time"],
            ["repeat", "Repeat"],
          ].map(([k, l]) => (
            <button key={k} type="button" className={filter === k ? "ad-tab active" : "ad-tab"} onClick={() => setFilter(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="ad-empty">
          <UsersIcon size={28} />
          <strong>No customers yet</strong>
          <p>Customers appear here after their first order.</p>
        </div>
      ) : (
        shown.map((c) => {
          const fav = Array.from(c.drinks.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([n, k]) => `${n} ×${k}`)
            .join(", ");
          return (
            <div className="ad-product-row" key={c.id} style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
              <div className="ad-product-info">
                <strong>
                  {c.name}
                  <span className={c.done >= 2 ? "ad-hidden-tag ok" : "ad-hidden-tag"}>
                    {c.done >= 5 ? "LOYAL" : c.done >= 2 ? "REPEAT" : "FIRST-TIME"}
                  </span>
                </strong>
                <small>
                  Room {c.room || "—"} · {c.contact || "No contact"} · {c.done} completed of {c.orders} orders · last{" "}
                  {new Date(c.last).toLocaleDateString("fr-DZ")}
                </small>
                {fav && <small>Favourites: {fav}</small>}
                {c.notes && <small>Note: {c.notes}</small>}
              </div>
              <span className="ad-price">{cash(c.spent)}</span>
              <button type="button" className="ad-link-btn" onClick={() => editNote(c)}>
                Note
              </button>
              {whatsappLink(c.contact) && (
                <a className="ad-link-btn" href={whatsappLink(c.contact) ?? "#"} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              )}
            </div>
          );
        })
      )}
    </Panel>
  );
}

/* ====================================================================== */
/* Reviews                                                                 */
/* ====================================================================== */

function Reviews({ reviews, onToggle }: { reviews: Review[]; onToggle: (r: Review) => void }) {
  const verifiedOf = (r: Review) => DONE_STATUSES.includes(r.orders?.status ?? "");
  const counted = reviews.filter((r) => verifiedOf(r) && !r.hidden);
  const avg = counted.length ? sum(counted.map((r) => Number(r.rating) || 0)) / counted.length : 0;
  const complaints = counted.filter((r) => (Number(r.rating) || 0) <= 2);

  const dist = [5, 4, 3, 2, 1].map((n) => ({
    label: `${n} star`,
    value: counted.filter((r) => Number(r.rating) === n).length,
  }));

  const trend = useMemo(() => {
    const months: { key: string; label: string; total: number; n: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en", { month: "short" }), total: 0, n: 0 });
    }
    counted.forEach((r) => {
      const d = new Date(r.created_at);
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) {
        m.total += Number(r.rating) || 0;
        m.n += 1;
      }
    });
    return months.map((m) => ({ label: m.label, value: m.n ? Number((m.total / m.n).toFixed(1)) : 0 }));
  }, [counted]);

  return (
    <div className="ad-stack">
      <div className="ad-stats auto">
        <Stat icon={<StarIcon size={20} />} label="AVERAGE RATING" value={counted.length ? avg.toFixed(1) : "—"} hint="Verified, visible reviews" />
        <Stat icon={<ReceiptIcon size={20} />} orange label="TOTAL REVIEWS" value={reviews.length} hint={`${counted.length} counted`} />
        <Stat icon={<StarIcon size={20} />} orange label="COMPLAINTS" value={complaints.length} hint="Rated 1–2 stars" />
      </div>

      <div className="ad-grid">
        <Panel title="Rating spread">
          <HBars rows={dist} />
        </Panel>
        <Panel title="Rating trend" sub="Average per month, last 6 months">
          <VBars rows={trend} />
        </Panel>
      </div>

      <Panel title="All reviews" sub="A review counts as verified only when its order was delivered or finished.">
        {reviews.length === 0 ? (
          <div className="ad-empty">
            <StarIcon size={28} />
            <strong>No reviews yet</strong>
            <p>Reviews from customers will appear here.</p>
          </div>
        ) : (
          reviews.map((r) => (
            <div className="ad-product-row" key={r.id} style={{ flexWrap: "wrap" }}>
              <div className="ad-product-info">
                <strong>
                  {r.customers?.name || "Customer"}{" "}
                  <span className="ad-stars" aria-label={`${r.rating ?? 0} out of 5`}>
                    {"★".repeat(Math.max(0, Math.min(5, Number(r.rating) || 0)))}
                  </span>
                  {verifiedOf(r) ? (
                    <span className="ad-hidden-tag ok">VERIFIED</span>
                  ) : (
                    <span className="ad-hidden-tag">ORDER NOT DELIVERED</span>
                  )}
                  {r.hidden && <span className="ad-hidden-tag">HIDDEN</span>}
                </strong>
                <small>{r.comment || "No comment"}</small>
              </div>
              <button type="button" className={r.hidden ? "ad-link-btn" : "ad-link-btn danger"} onClick={() => onToggle(r)}>
                {r.hidden ? "Show" : "Hide"}
              </button>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}

function CommunityReviews({ onError }: { onError: (message: string) => void }) {
  const [items, setItems] = useState<{ id: string; name: string; rating: number; comment: string | null; created_at: string; approved: boolean }[]>([]);
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_community_reviews');
    if (error) onError(`Community reviews could not be loaded: ${error.message}`);
    else setItems((data ?? []) as typeof items);
  }, [onError]);
  useEffect(() => { void load(); }, [load]);
  async function decide(id: string, approved: boolean) {
    setBusy(id);
    const { error } = await supabase.rpc('moderate_community_review', { p_id: id, p_approved: approved });
    setBusy('');
    if (error) onError(`Could not update review: ${error.message}`); else await load();
  }
  return <Panel title="Community review submissions" sub="Approve a review to publish it, or reject it to keep it off the site.">
    {items.length === 0 ? <div className="ad-empty">No community reviews waiting or published.</div> : items.map((r) => <div className="ad-product-row" key={r.id} style={{ flexWrap: 'wrap' }}>
      <div className="ad-product-info"><strong>{r.name} <span className="ad-stars">{'★'.repeat(r.rating)}</span> {r.approved ? <span className="ad-hidden-tag ok">PUBLISHED</span> : <span className="ad-hidden-tag">PENDING</span>}</strong><small>{r.comment || 'No comment'}</small></div>
      {!r.approved ? <><button disabled={busy === r.id} className="ad-link-btn" onClick={() => void decide(r.id, true)}>Approve</button><button disabled={busy === r.id} className="ad-link-btn danger" onClick={() => void decide(r.id, false)}>Reject</button></> : <button disabled={busy === r.id} className="ad-link-btn danger" onClick={() => void decide(r.id, false)}>Unpublish</button>}
    </div>)}
  </Panel>;
}

/* ====================================================================== */
/* Inventory                                                               */
/* ====================================================================== */

function Inventory({
  orders,
  products,
  onError,
}: {
  orders: Order[];
  products: Product[];
  onError: (m: string) => void;
}) {
  const [items, setItems] = useState<InvItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [moves, setMoves] = useState<Movement[]>([]);
  const [tab, setTab] = useState<"stock" | "recipes" | "history">("stock");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", unit: "", category: "", stock: "", low: "", cost: "", supplier: "" });
  const [recipeProduct, setRecipeProduct] = useState("");
  const [recipeItem, setRecipeItem] = useState("");
  const [recipeQty, setRecipeQty] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [stockCategory, setStockCategory] = useState("all");
  const [stockLevel, setStockLevel] = useState("all");

  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from("inventory_items").select("*").order("name"),
      supabase.from("product_ingredients").select("*"),
      supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (a.error) onError(`Inventory could not be loaded: ${a.error.message}. Run admin-upgrade.sql first.`);
    else setItems((a.data ?? []) as InvItem[]);
    if (!b.error) setRecipes((b.data ?? []) as Recipe[]);
    if (!c.error) setMoves((c.data ?? []) as Movement[]);
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const usage = useMemo(() => {
    const since = addDays(startOfDay(new Date()), -30);
    const perProduct = new Map<string, number>();
    orders
      .filter((o) => isDone(o) && new Date(o.created_at) >= since)
      .forEach((o) =>
        (o.order_items ?? []).forEach((i) => {
          if (i.product_id) perProduct.set(String(i.product_id), (perProduct.get(String(i.product_id)) ?? 0) + i.quantity);
        })
      );
    const out = new Map<string, number>();
    recipes.forEach((rc) => {
      const qty = perProduct.get(String(rc.product_id)) ?? 0;
      out.set(rc.item_id, (out.get(rc.item_id) ?? 0) + qty * Number(rc.quantity));
    });
    return out;
  }, [orders, recipes]);

  const low = items.filter((i) => Number(i.stock) <= Number(i.low_stock_threshold));

  const invCategories = Array.from(
    new Set(items.map((i) => i.category).filter((c): c is string => !!c))
  ).sort((a, b) => a.localeCompare(b));

  const shownItems = items.filter((i) => {
    const q = stockSearch.trim().toLowerCase();
    if (q && !`${i.name} ${i.category ?? ""} ${i.supplier ?? ""}`.toLowerCase().includes(q)) return false;
    if (stockCategory !== "all" && (i.category ?? "") !== stockCategory) return false;
    const stock = Number(i.stock);
    const isLowItem = stock <= Number(i.low_stock_threshold);
    if (stockLevel === "low") return isLowItem;
    if (stockLevel === "out") return stock <= 0;
    if (stockLevel === "ok") return !isLowItem;
    return true;
  });
  const stockFiltersOn = stockSearch.trim() !== "" || stockCategory !== "all" || stockLevel !== "all";

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("inventory_items").insert({
      name: form.name.trim(),
      unit: form.unit.trim() || null,
      category: form.category.trim() || null,
      stock: Number(form.stock) || 0,
      low_stock_threshold: Number(form.low) || 0,
      cost_per_unit: Number(form.cost) || 0,
      supplier: form.supplier.trim() || null,
    });
    if (error) {
      onError(`Could not add the item: ${error.message}`);
      return;
    }
    setForm({ name: "", unit: "", category: "", stock: "", low: "", cost: "", supplier: "" });
    setShowForm(false);
    load();
  }

  async function move(it: InvItem, kind: "purchase" | "usage" | "adjustment") {
    const unit = it.unit || "units";
    const q = window.prompt(
      kind === "adjustment"
        ? `Stock adjustment for ${it.name} in ${unit} (use a minus sign to remove)`
        : kind === "purchase"
        ? `Quantity bought of ${it.name} (${unit})`
        : `Quantity used of ${it.name} (${unit})`
    );
    if (q === null) return;
    const qty = Number(q);
    if (!isFinite(qty) || qty === 0) {
      onError("Enter a number other than zero.");
      return;
    }
    let cost: number | null = null;
    if (kind === "purchase") {
      const c = window.prompt("Cost per unit in DA (optional)");
      if (c === null) return;
      if (c.trim() !== "") {
        cost = Number(c);
        if (!isFinite(cost)) {
          onError("Cost must be a number.");
          return;
        }
      }
    }
    const { error } = await supabase.rpc("record_stock_movement", {
      p_item: it.id,
      p_kind: kind,
      p_quantity: qty,
      p_unit_cost: cost,
      p_note: null,
    });
    if (error) onError(`Could not record the movement: ${error.message}`);
    else load();
  }

  async function removeItem(it: InvItem) {
    if (!window.confirm(`Delete "${it.name}" and its history?`)) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", it.id);
    if (error) onError(`Could not delete: ${error.message}`);
    else load();
  }

  async function addIngredient() {
    const qty = Number(recipeQty);
    if (!recipeProduct || !recipeItem || !isFinite(qty) || qty <= 0) {
      onError("Choose a drink, an ingredient and a quantity above zero.");
      return;
    }
    const { error } = await supabase
      .from("product_ingredients")
      .upsert({ product_id: recipeProduct, item_id: recipeItem, quantity: qty }, { onConflict: "product_id,item_id" });
    if (error) onError(`Could not save the recipe: ${error.message}`);
    else {
      setRecipeQty("");
      load();
    }
  }

  async function removeIngredient(rc: Recipe) {
    const { error } = await supabase.from("product_ingredients").delete().eq("id", rc.id);
    if (error) onError(`Could not remove: ${error.message}`);
    else load();
  }

  const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? "Item";
  const recipeRows = recipes.filter((rc) => rc.product_id === recipeProduct);
  const recipeCost = sum(
    recipeRows.map((rc) => Number(rc.quantity) * Number(items.find((i) => i.id === rc.item_id)?.cost_per_unit ?? 0))
  );
  const chosenProduct = products.find((p) => String(p.id) === recipeProduct);

  return (
    <div className="ad-stack">
      {low.length > 0 && (
        <div className="ad-notice" role="alert" style={{ marginTop: 0 }}>
          <strong>Low stock</strong>
          {low.map((i) => `${i.name} (${Number(i.stock)} ${i.unit ?? ""})`).join(" · ")}
        </div>
      )}

      <div className="ad-tabs" style={{ marginBottom: 0 }}>
        {(
          [
            ["stock", "Stock"],
            ["recipes", "Drink recipes"],
            ["history", "History"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" className={tab === k ? "ad-tab active" : "ad-tab"} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {tab === "stock" && (
        <Panel
          title="Ingredients and supplies"
          sub="Juice, milk, syrups, tea, fruit, cups, lids…"
          action={
            <button type="button" className="ad-btn" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Close" : "Add item"}
            </button>
          }
        >
          {showForm && (
            <form className="ad-form" onSubmit={addItem} style={{ marginBottom: 22 }}>
              <label className="ad-field">
                <span>Name</span>
                <input className="ad-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="ad-field">
                <span>Unit</span>
                <input className="ad-input" placeholder="L, kg, pcs" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </label>
              <label className="ad-field">
                <span>Category</span>
                <input className="ad-input" placeholder="Juice, syrup, cups…" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </label>
              <label className="ad-field">
                <span>Supplier</span>
                <input className="ad-input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              </label>
              <label className="ad-field">
                <span>Starting stock</span>
                <input className="ad-input" type="number" min="0" step="any" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </label>
              <label className="ad-field">
                <span>Low-stock alert at</span>
                <input className="ad-input" type="number" min="0" step="any" value={form.low} onChange={(e) => setForm({ ...form, low: e.target.value })} />
              </label>
              <label className="ad-field">
                <span>Cost per unit (DA)</span>
                <input className="ad-input" type="number" min="0" step="any" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </label>
              <div className="ad-form-actions">
                <button className="ad-btn" type="submit">
                  Save item
                </button>
              </div>
            </form>
          )}

          {items.length > 0 && (
            <div className="ad-toolbar">
              <input className="ad-input" placeholder="Search name, category or supplier" value={stockSearch} onChange={(e) => setStockSearch(e.target.value)} />
              <select className="ad-input" style={{ maxWidth: 190 }} aria-label="Filter by category" value={stockCategory} onChange={(e) => setStockCategory(e.target.value)}>
                <option value="all">All categories</option>
                {invCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select className="ad-input" style={{ maxWidth: 190 }} aria-label="Filter by stock level" value={stockLevel} onChange={(e) => setStockLevel(e.target.value)}>
                <option value="all">All stock levels</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
                <option value="ok">In stock</option>
              </select>
              {stockFiltersOn && (
                <button type="button" className="ad-link-btn" onClick={() => { setStockSearch(""); setStockCategory("all"); setStockLevel("all"); }}>
                  Clear filters
                </button>
              )}
              <small style={{ color: "var(--muted)" }}>Showing {shownItems.length} of {items.length}</small>
            </div>
          )}

          {items.length === 0 ? (
            <div className="ad-empty">
              <BoxIcon size={28} />
              <strong>No inventory yet</strong>
              <p>Add your first ingredient with the button above.</p>
            </div>
          ) : shownItems.length === 0 ? (
            <div className="ad-empty">
              <strong>No items match</strong>
              <p>Try another search or clear the filters.</p>
            </div>
          ) : (
            shownItems.map((i) => {
              const isLow = Number(i.stock) <= Number(i.low_stock_threshold);
              return (
                <div className="ad-product-row" key={i.id} style={{ flexWrap: "wrap" }}>
                  <div className="ad-product-info">
                    <strong>
                      {i.name}
                      {isLow && <span className="ad-hidden-tag">LOW</span>}
                    </strong>
                    <small>
                      {i.category || "No category"} · {i.supplier || "No supplier"} · {cash(Number(i.cost_per_unit))} per {i.unit || "unit"} · est. use
                      30 days: {Math.round((usage.get(i.id) ?? 0) * 100) / 100} {i.unit ?? ""}
                    </small>
                  </div>
                  <span className="ad-price">
                    {Number(i.stock)} {i.unit ?? ""}
                  </span>
                  <div className="ad-order-btns">
                    <button type="button" className="ad-link-btn" onClick={() => move(i, "purchase")}>
                      Bought
                    </button>
                    <button type="button" className="ad-link-btn" onClick={() => move(i, "usage")}>
                      Used
                    </button>
                    <button type="button" className="ad-link-btn" onClick={() => move(i, "adjustment")}>
                      Adjust
                    </button>
                    <button type="button" className="ad-link-btn danger" onClick={() => removeItem(i)}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </Panel>
      )}

      {tab === "recipes" && (
        <Panel title="Drink recipes" sub="Recipe costs update product margins automatically. Ingredient stock is deducted when an order is delivered.">
          <div className="ad-form" style={{ marginBottom: 18 }}>
            <label className="ad-field full">
              <span>Drink</span>
              <select className="ad-input" value={recipeProduct} onChange={(e) => setRecipeProduct(e.target.value)}>
                <option value="">Choose a drink…</option>
                {products.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {recipeProduct && (
            <>
              {recipeRows.length === 0 ? (
                <div className="ad-empty">No ingredients set for this drink yet.</div>
              ) : (
                recipeRows.map((rc) => (
                  <div className="ad-product-row" key={rc.id}>
                    <div className="ad-product-info">
                      <strong>{itemName(rc.item_id)}</strong>
                      <small>per drink</small>
                    </div>
                    <span className="ad-price">
                      {Number(rc.quantity)} {items.find((i) => i.id === rc.item_id)?.unit ?? ""}
                    </span>
                    <button type="button" className="ad-link-btn danger" onClick={() => removeIngredient(rc)}>
                      Remove
                    </button>
                  </div>
                ))
              )}

              <p style={{ margin: "14px 0", fontSize: 13, color: "var(--muted)" }}>
                Ingredient cost from recipe: <b style={{ color: "#fff" }}>{cash(Math.round(recipeCost))}</b>
                {chosenProduct ? ` · cost saved on the product: ${cash(Number(chosenProduct.cost) || 0)}` : ""}
              </p>

              <div className="ad-form">
                <label className="ad-field">
                  <span>Ingredient</span>
                  <select className="ad-input" value={recipeItem} onChange={(e) => setRecipeItem(e.target.value)}>
                    <option value="">Choose…</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ad-field">
                  <span>Quantity per drink</span>
                  <input className="ad-input" type="number" min="0" step="any" value={recipeQty} onChange={(e) => setRecipeQty(e.target.value)} />
                </label>
                <div className="ad-form-actions">
                  <button type="button" className="ad-btn" onClick={addIngredient}>
                    Save ingredient
                  </button>
                </div>
              </div>
            </>
          )}
        </Panel>
      )}

      {tab === "history" && (
        <Panel title="Stock history" sub="Latest 100 movements">
          {moves.length === 0 ? (
            <div className="ad-empty">No stock movements yet.</div>
          ) : (
            moves.map((mv) => (
              <div className="ad-product-row" key={mv.id}>
                <div className="ad-product-info">
                  <strong>
                    {itemName(mv.item_id)} <span className="ad-hidden-tag ok">{mv.kind.toUpperCase()}</span>
                  </strong>
                  <small>
                    {new Date(mv.created_at).toLocaleString("fr-DZ")}
                    {mv.created_by ? ` · ${mv.created_by}` : ""}
                    {mv.unit_cost != null ? ` · ${cash(Number(mv.unit_cost))} per unit` : ""}
                  </small>
                </div>
                <span className={Number(mv.quantity) < 0 ? "ad-price ad-neg" : "ad-price"}>
                  {Number(mv.quantity) > 0 ? "+" : ""}
                  {Number(mv.quantity)}
                </span>
              </div>
            ))
          )}
        </Panel>
      )}
    </div>
  );
}

/* ====================================================================== */
/* Store settings                                                          */
/* ====================================================================== */

function DeliveryFees({ onError }: { onError: (m: string) => void }) {
  const [rows, setRows] = useState<{ block: string; fee: number }[]>([]);
  const [block, setBlock] = useState("");
  const [fee, setFee] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("delivery_fees").select("block, fee").order("block");
    if (error) onError(`Delivery fees could not be loaded: ${error.message}`);
    else setRows((data ?? []) as { block: string; fee: number }[]);
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const b = block.trim().toUpperCase();
    const f = Number(fee);
    if (!b || !isFinite(f) || f < 0) {
      onError("Enter a block letter and a fee of 0 or more.");
      return;
    }
    const { error } = await supabase.from("delivery_fees").upsert({ block: b, fee: f }, { onConflict: "block" });
    if (error) onError(`Could not save the fee: ${error.message}`);
    else {
      setBlock("");
      setFee("");
      await load();
    }
  }

  async function remove(b: string) {
    const { error } = await supabase.from("delivery_fees").delete().eq("block", b);
    if (error) onError(`Could not delete: ${error.message}`);
    else await load();
  }

  return (
    <Panel title="Delivery fee by block" sub="Blocks not listed here use the default fee.">
      <form className="ad-form" onSubmit={save} style={{ marginBottom: 18 }}>
        <label className="ad-field">
          <span>Block</span>
          <input className="ad-input" maxLength={1} placeholder="A" value={block} onChange={(e) => setBlock(e.target.value.replace(/[^a-z]/gi, "").toUpperCase())} />
        </label>
        <label className="ad-field">
          <span>Fee (DA)</span>
          <input className="ad-input" type="number" min="0" step="any" value={fee} onChange={(e) => setFee(e.target.value)} />
        </label>
        <div className="ad-form-actions">
          <button className="ad-btn" type="submit">Save fee</button>
        </div>
      </form>
      {rows.length === 0 ? (
        <div className="ad-empty">No block fees yet. The default fee applies to everyone.</div>
      ) : (
        rows.map((r) => (
          <div className="ad-product-row" key={r.block}>
            <div className="ad-product-info"><strong>Block {r.block}</strong></div>
            <span className="ad-price">{cash(Number(r.fee))}</span>
            <button type="button" className="ad-link-btn danger" onClick={() => remove(r.block)}>Delete</button>
          </div>
        ))
      )}
    </Panel>
  );
}

function StoreSettings({
  settings,
  onSave,
  onError,
}: {
  settings: Settings;
  onSave: (patch: Partial<Settings>) => Promise<boolean>;
  onError: (m: string) => void;
}) {
  const [d, setD] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setD(settings), [settings]);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setD((x) => ({ ...x, [k]: v }));
  const time = (v: string | null) => (v ? v.slice(0, 5) : "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { id: _id, is_open: _open, ...rest } = d;
    void _id;
    void _open;
    await onSave(rest);
    setSaving(false);
  }

  return (
    <div className="ad-stack">
      <Panel title="Shop controls" sub="Open, close, or pause ordering instantly.">
        <div className="ad-switch-row" style={{ marginBottom: 0 }}>
          <div>
            <strong>{settings.is_open ? "Shop is open" : "Shop is closed"}</strong>
            <small>{settings.is_open ? "Customers can place orders." : "Ordering is paused for customers."}</small>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.is_open}
            aria-label="Shop open"
            className={settings.is_open ? "ad-switch on" : "ad-switch"}
            onClick={() => onSave({ is_open: !settings.is_open, schedule_enabled: false })}
          />
        </div>
        <label className="ad-check" style={{ marginTop: 16 }}>
          <input
            type="checkbox"
            checked={d.schedule_enabled}
            disabled={!d.opens_at || !d.closes_at}
            onChange={(e) => set("schedule_enabled", e.target.checked)}
          />
          Automatically follow these opening hours
        </label>
        <small style={{ display: "block", marginTop: 8, opacity: 0.72 }}>
          Set and save both opening times first. Saving this option lets the shop open and close each day using those hours. Manually changing the shop switch turns the schedule off.
        </small>
      </Panel>

      <Panel title="Store details" sub="Orders are refused outside business hours, below the minimum, and while the shop is closed.">
        <form className="ad-form" onSubmit={submit}>
          <label className="ad-field">
            <span>Store name</span>
            <input className="ad-input" value={d.store_name} onChange={(e) => set("store_name", e.target.value)} />
          </label>
          <label className="ad-field">
            <span>Logo URL</span>
            <input className="ad-input" value={d.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} />
          </label>
          <label className="ad-field">
            <span>WhatsApp ordering number</span>
            <input className="ad-input" placeholder="213555123456" value={d.whatsapp_number ?? ""} onChange={(e) => set("whatsapp_number", e.target.value)} />
          </label>
          <label className="ad-field">
            <span>Contact phone</span>
            <input className="ad-input" value={d.contact_phone ?? ""} onChange={(e) => set("contact_phone", e.target.value)} />
          </label>
          <label className="ad-field">
            <span>Currency</span>
            <input className="ad-input" value={d.currency} onChange={(e) => set("currency", e.target.value)} />
          </label>
          <label className="ad-field">
            <span>Preparation time (minutes)</span>
            <input className="ad-input" type="number" min="0" value={d.prep_minutes} onChange={(e) => set("prep_minutes", Number(e.target.value) || 0)} />
          </label>
          <label className="ad-field">
            <span>Opens at</span>
            <input className="ad-input" type="time" value={time(d.opens_at)} onChange={(e) => set("opens_at", e.target.value || null)} />
          </label>
          <label className="ad-field">
            <span>Closes at</span>
            <input className="ad-input" type="time" value={time(d.closes_at)} onChange={(e) => set("closes_at", e.target.value || null)} />
          </label>
          <div className="ad-field full">
            <span>Closed days</span>
            <div className="ad-toggles">
              {WEEK_DAYS.map((day) => (
                <label className="ad-check" key={day.value}>
                  <input
                    type="checkbox"
                    checked={d.closed_days.includes(day.value)}
                    onChange={(e) => set(
                      "closed_days",
                      e.target.checked
                        ? [...d.closed_days, day.value].sort((a, b) => a - b)
                        : d.closed_days.filter((value) => value !== day.value),
                    )}
                  />
                  {day.label}
                </label>
              ))}
            </div>
            <small>Choose the days the shop is closed. Leave all unchecked to open every day.</small>
          </div>
          <label className="ad-field">
            <span>Minimum order (DA)</span>
            <input className="ad-input" type="number" min="0" step="any" value={d.min_order} onChange={(e) => set("min_order", Number(e.target.value) || 0)} />
          </label>
          <label className="ad-field">
            <span>Delivery or pickup</span>
            <select className="ad-input" value={d.fulfillment} onChange={(e) => set("fulfillment", e.target.value)}>
              <option value="delivery">Delivery to room</option>
              <option value="pickup">Pickup only</option>
              <option value="both">Delivery and pickup</option>
            </select>
          </label>
          <label className="ad-field">
            <span>Default delivery fee (DA)</span>
            <input className="ad-input" type="number" min="0" step="any" value={d.delivery_fee_default} onChange={(e) => set("delivery_fee_default", Number(e.target.value) || 0)} />
          </label>
          <label className="ad-field">
            <span>Discount on every order (%)</span>
            <input className="ad-input" type="number" min="0" max="100" step="any" value={d.discount_percent} onChange={(e) => set("discount_percent", Number(e.target.value) || 0)} />
          </label>
          <label className="ad-field">
            <span>Promotional banner</span>
            <input className="ad-input" value={d.banner_text ?? ""} onChange={(e) => set("banner_text", e.target.value)} />
          </label>
          <label className="ad-field full">
            <span>Notice shown to customers</span>
            <textarea className="ad-input" value={d.notice ?? ""} onChange={(e) => set("notice", e.target.value)} />
          </label>
          <div className="ad-form-actions">
            <button className="ad-btn" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </form>
      </Panel>
      <DeliveryFees onError={onError} />
    </div>
  );
}

/* ====================================================================== */
/* Security & system                                                       */
/* ====================================================================== */

function Security({
  session,
  connected,
  issues,
  onSignOut,
  onError,
}: {
  session: Session;
  connected: boolean;
  issues: string[];
  onSignOut: () => void;
  onError: (m: string) => void;
}) {
  const [role, setRole] = useState("…");
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [admins, setAdmins] = useState<{ email: string; role: string }[]>([]);
  const [errors, setErrors] = useState<{ id: string; created_at: string; source: string; message: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await supabase.rpc("admin_role");
      setRole(typeof r.data === "string" ? r.data : "no access");
      const a = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(50);
      if (!a.error) setAudit((a.data ?? []) as AuditRow[]);
      const u = await supabase.from("admin_users").select("email, role").order("email");
      if (!u.error) setAdmins((u.data ?? []) as { email: string; role: string }[]);
      const e = await supabase.from("error_log").select("*").order("created_at", { ascending: false }).limit(30);
      if (!e.error) setErrors((e.data ?? []) as typeof errors);
    })();
  }, []);

  async function backup() {
    setBusy(true);
    const tables = ["products", "customers", "orders", "order_items", "reviews", "expenses", "business_settings", "inventory_items", "stock_movements", "product_ingredients"];
    const out: Record<string, unknown> = { exported_at: new Date().toISOString() };
    for (const t of tables) {
      const { data, error } = await supabase.from(t).select("*").limit(50000);
      if (error) onError(`Backup skipped ${t}: ${error.message}`);
      else out[t] = data;
    }
    downloadFile(`hyfux-backup-${dayKey(new Date())}.json`, JSON.stringify(out, null, 2), "application/json");
    setBusy(false);
  }

  const describe = (a: AuditRow) => {
    const d = a.details ?? {};
    if (a.action === "price_change") return `Price of ${d.product}: ${d.old_price} → ${d.new_price} DA (cost ${d.old_cost} → ${d.new_cost})`;
    if (a.action === "order_status") return `Order ${shortId(String(d.order))}: ${d.from} → ${d.to}${d.reason ? ` (${d.reason})` : ""}`;
    if (a.action === "product_deleted") return `Deleted product ${d.product}`;
    if (a.action === "refund") return `Refund of ${d.amount} DA on order ${shortId(String(d.order))}`;
    if (a.action === "settings_changed") return `Settings changed (shop ${d.is_open ? "open" : "closed"})`;
    return a.action;
  };

  return (
    <div className="ad-stack">
      <div className="ad-stats auto">
        <Stat icon={<ShieldIcon size={20} />} label="SIGNED IN AS" value={<span style={{ fontSize: 16 }}>{session.user.email}</span>} hint={`Role: ${role}`} />
        <Stat icon={<GridIcon size={20} />} orange label="DATABASE" value={connected ? "Connected" : "Problem"} hint="Supabase connection status" />
        <Stat icon={<ReceiptIcon size={20} />} label="ISSUES THIS SESSION" value={issues.length} />
      </div>

      <div className="ad-grid">
        <Panel title="Activity log" sub="Price changes, order status changes, refunds, settings">
          {audit.length === 0 ? (
            <div className="ad-empty">No activity recorded yet.</div>
          ) : (
            audit.map((a) => (
              <div className="ad-product-row" key={a.id}>
                <div className="ad-product-info">
                  <strong>{describe(a)}</strong>
                  <small>
                    {new Date(a.created_at).toLocaleString("fr-DZ")} · {a.actor || "system"}
                  </small>
                </div>
              </div>
            ))
          )}
        </Panel>

        <Panel title="Admins and roles" sub="Owner: everything · Admin: everything except admins · Staff: orders, customers, reviews">
          {admins.length === 0 ? (
            <div className="ad-empty">Only the owner and admins can see this list.</div>
          ) : (
            admins.map((a) => (
              <div className="ad-product-row" key={a.email}>
                <div className="ad-product-info">
                  <strong>{a.email}</strong>
                </div>
                <span className="ad-hidden-tag ok">{a.role.toUpperCase()}</span>
              </div>
            ))
          )}
          <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
            To add someone: create their user in Supabase → Authentication, then add their email to the admin_users table with a role.
          </p>
        </Panel>
      </div>

      <div className="ad-grid">
        <Panel title="Errors and failed order submissions" sub="Reported by the customer store and by this panel">
          {errors.length === 0 && issues.length === 0 ? (
            <div className="ad-empty">No errors recorded.</div>
          ) : (
            <>
              {issues.map((m, i) => (
                <div className="ad-product-row" key={`i${i}`}>
                  <div className="ad-product-info">
                    <strong>{m}</strong>
                    <small>This panel, this session</small>
                  </div>
                </div>
              ))}
              {errors.map((e) => (
                <div className="ad-product-row" key={e.id}>
                  <div className="ad-product-info">
                    <strong>{e.message}</strong>
                    <small>
                      {e.source} · {new Date(e.created_at).toLocaleString("fr-DZ")}
                    </small>
                  </div>
                </div>
              ))}
            </>
          )}
        </Panel>

        <Panel title="Backup and access" sub="Keep a copy of your business data">
          <div className="ad-actions">
            <button type="button" className="ad-btn" disabled={busy} onClick={backup}>
              {busy ? "Preparing…" : "Download full backup (JSON)"}
            </button>
            <button type="button" className="ad-link-btn danger" onClick={onSignOut}>
              Sign out
            </button>
          </div>
          <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
            Access rules are enforced by Row Level Security in Supabase. Customers can only read products and the open/closed status, and place orders
            through the checkout function. Never put a service_role key in this app.
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ====================================================================== */

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [communityReviewCount, setCommunityReviewCount] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [section, setSection] = useState("Overview");
  const [navOpen, setNavOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const [form, setForm] = useState<ProductForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState("all");
  const [productStatus, setProductStatus] = useState("all");

  const [orderTab, setOrderTab] = useState("active");
  const [orderSearch, setOrderSearch] = useState("");

  const report = useCallback((msg: string) => {
    setMessage(msg);
    setIssues((prev) =>
      [`${new Date().toLocaleTimeString("fr-DZ")} — ${msg}`, ...prev].slice(0, 30)
    );
  }, []);

  /* ---------- Auth ---------- */
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setSigningIn(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) setAuthError("Email or password is incorrect.");
    setPassword("");
    setSigningIn(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProducts([]);
    setOrders([]);
    setReviews([]);
    setExpenses([]);
    setConnected(false);
    setSection("Overview");
  }

  /* ---------- Data loaders ---------- */
  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from(T_PRODUCTS)
      .select("*")
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) {
      report("Products could not be loaded. Check the table name and permissions.");
      return false;
    }
    setProducts((data ?? []) as Product[]);
    return true;
  }, [report]);

  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from(T_ORDERS)
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) report(`Orders could not be loaded: ${error.message}`);
    else setOrders((data ?? []) as unknown as Order[]);
  }, [report]);

  const loadLowStockCount = useCallback(async () => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("stock, low_stock_threshold");
    if (!error) {
      setLowStockCount(
        (data ?? []).filter(
          (item) => Number(item.stock) <= Number(item.low_stock_threshold)
        ).length
      );
    }
  }, []);

  const loadReviews = useCallback(async () => {
    const { data, error } = await supabase
      .from(T_REVIEWS)
      .select("*, customers(name), orders(status)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error) setReviews((data ?? []) as unknown as Review[]);
  }, []);

  const loadCommunityReviewCount = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_community_reviews");
    if (!error) {
      const pending = (data ?? []).filter((review: { approved?: boolean }) => !review.approved).length;
      setCommunityReviewCount(pending);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    const { data, error } = await supabase
      .from(T_EXPENSES)
      .select("*")
      .order("expense_date", { ascending: false })
      .limit(2000);
    if (!error) setExpenses((data ?? []) as Expense[]);
  }, []);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from(T_SETTINGS)
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (data) setSettings({ ...DEFAULT_SETTINGS, ...(data as Partial<Settings>) });
  }, []);

  useEffect(() => {
    if (!session) return;
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const ok = await loadProducts();
        await Promise.all([loadOrders(), loadReviews(), loadExpenses(), loadSettings(), loadLowStockCount(), loadCommunityReviewCount()]);
        if (alive) setConnected(ok);
      } catch {
        if (alive) report("Could not connect to Supabase.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const channel = supabase
      .channel("orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: T_ORDERS }, (payload) => {
        loadOrders();
        if (payload.eventType === "INSERT") notifyNewOrder();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          notifyLowStock(payload.new as Partial<InvItem>);
        }
        loadLowStockCount();
      })
      .subscribe();

    const communityReviewPoll = window.setInterval(() => {
      void loadCommunityReviewCount();
    }, 30000);

    return () => {
      alive = false;
      window.clearInterval(communityReviewPoll);
      supabase.removeChannel(channel);
    };
  }, [session, loadProducts, loadOrders, loadReviews, loadExpenses, loadSettings, loadLowStockCount, loadCommunityReviewCount, report]);

  /* ---------- Products ---------- */
  function openNewProduct() {
    setForm({ ...EMPTY_FORM });
    setNotice("");
  }

  function openEditProduct(p: Product, duplicate = false) {
    setForm({
      id: duplicate ? undefined : p.id,
      name: duplicate ? `${p.name} (copy)` : p.name,
      price: String(p.price ?? ""),
      cost: String(p.cost ?? ""),
      category: p.category ?? "",
      description: p.description ?? "",
      image_url: p.image_url ?? "",
      available: p.available !== false,
      manual_sold_out: !!p.manual_sold_out,
      ingredient_sold_out: !!p.ingredient_sold_out,
      featured: !!p.featured,
    });
    setNotice("");
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setMessage("");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, { upsert: false });
    if (error) {
      report(`Image upload failed. Create a public "${IMAGE_BUCKET}" storage bucket, or paste an image URL instead.`);
    } else {
      const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
      setForm((f) => (f ? { ...f, image_url: data.publicUrl } : f));
    }
    setUploading(false);
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim()) {
      report("Product name is required.");
      return;
    }
    setSaving(true);
    setMessage("");

    const payload = {
      name: form.name.trim(),
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      available: form.available,
      manual_sold_out: form.manual_sold_out,
      featured: form.featured,
      updated_at: new Date().toISOString(),
    };

    const { error } = form.id
      ? await supabase.from(T_PRODUCTS).update(payload).eq("id", form.id)
      : await supabase.from(T_PRODUCTS).insert(payload);

    if (error) {
      report(`Could not save the product: ${error.message}`);
    } else {
      setNotice(form.id ? "Product updated." : "Product added.");
      setForm(null);
      await loadProducts();
    }
    setSaving(false);
  }

  async function toggleProduct(p: Product, field: "available" | "manual_sold_out" | "featured") {
    const current = field === "available" ? p.available !== false : !!p[field];
    const { error } = await supabase
      .from(T_PRODUCTS)
      .update({ [field]: !current, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) report(`Update failed: ${error.message}`);
    else await loadProducts();
  }

  async function deleteProduct(p: Product) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from(T_PRODUCTS).delete().eq("id", p.id);
    if (error) report(`Delete failed: ${error.message}`);
    else {
      setNotice("Product deleted.");
      await loadProducts();
    }
  }

  /* ---------- Orders ---------- */
  async function setOrderStatus(o: Order, status: string, reason?: string) {
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (reason !== undefined) patch.cancel_reason = reason;
    const { error } = await supabase.from(T_ORDERS).update(patch).eq("id", o.id);
    if (error) report(`Could not update order: ${error.message}`);
    else await loadOrders();
  }

  function stopOrder(o: Order, status: "rejected" | "cancelled") {
    const reason = window.prompt(
      status === "rejected" ? "Reason for rejecting this order?" : "Reason for cancelling this order?"
    );
    if (reason === null) return;
    if (!reason.trim()) {
      report("A reason is required.");
      return;
    }
    setOrderStatus(o, status, reason.trim());
  }

  async function recordRefund(o: Order) {
    const raw = window.prompt(`Refund amount for order #${shortId(o.id)} (max ${orderTotal(o)} DA)`, String(o.refund_amount ?? 0));
    if (raw === null) return;
    const amount = Number(raw);
    if (!isFinite(amount) || amount < 0 || amount > orderTotal(o)) {
      report("Refund must be between 0 and the order total.");
      return;
    }
    const { error } = await supabase
      .from(T_ORDERS)
      .update({ refund_amount: amount, updated_at: new Date().toISOString() })
      .eq("id", o.id);
    if (error) report(`Could not record the refund: ${error.message}`);
    else {
      setNotice("Refund recorded.");
      await loadOrders();
    }
  }

  /* ---------- Reviews ---------- */
  async function toggleReviewHidden(r: Review) {
    const { error } = await supabase.from(T_REVIEWS).update({ hidden: !r.hidden }).eq("id", r.id);
    if (error) report(`Update failed: ${error.message}`);
    else await loadReviews();
  }

  function reviewRequestLink(o: Order) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return whatsappLink(
      o.customers?.contact,
      `Hello ${o.customers?.name ?? ""}! 🍹 Thank you for ordering from HYFUX MIXBAR. Your order #${shortId(o.id)} was delivered. We'd love to know what you think, it takes 10 seconds: ${origin}/track?code=${o.id}`
    );
  }

  /* ---------- Settings ---------- */
  async function saveSettings(patch: Partial<Settings>) {
    const openingShop = patch.is_open === true && settings.is_open !== true;
    const { error } = await supabase
      .from(T_SETTINGS)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) {
      report(`Could not save settings: ${error.message}`);
      return false;
    }
    setSettings((s) => ({ ...s, ...patch }));

    if (openingShop) {
      const { data, error: pushError } = await supabase.functions.invoke(
        "shop-open-push",
        { body: { action: "notify-open" } }
      );
      if (pushError || data?.error) {
        setNotice("Shop is open, but customer notifications could not be sent. Check push setup.");
        return true;
      }
      setNotice(`Shop is now open. Sent notifications to ${Number(data?.sent) || 0} customer device(s).`);
      return true;
    }

    setNotice(
      "is_open" in patch && Object.keys(patch).length === 1
        ? patch.is_open
          ? "Shop is now open."
          : "Shop is now closed."
        : "Settings saved."
    );
    return true;
  }

  const toggleShop = () =>
    saveSettings({ is_open: !settings.is_open, schedule_enabled: false });

  /* ---------- Derived numbers ---------- */
  const todaysOrders = orders.filter((o) => isToday(o.created_at));
  const todaysDone = todaysOrders.filter(isDone);
  const todaysRevenue = sum(todaysDone.map(orderTotal));
  const todaysGross =
    todaysRevenue -
    sum(todaysDone.map(orderCost)) -
    sum(todaysDone.map((o) => Number(o.refund_amount) || 0));
  const todaysExpenses = sum(
    expenses.filter((e) => e.expense_date === dayKey(new Date())).map((e) => Number(e.amount) || 0)
  );
  const todaysNet = todaysGross - todaysExpenses;

  const waiting = orders.filter((o) => o.status === "new").length;
  const preparing = orders.filter((o) => o.status === "preparing").length;
  const ready = orders.filter((o) => o.status === "ready").length;

  useEffect(() => {
    document.title = waiting > 0 ? `(${waiting}) HYFUX MIXBAR` : "HYFUX MIXBAR";
    const badgeNavigator = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    const badgeUpdate = waiting > 0
      ? badgeNavigator.setAppBadge?.(waiting)
      : badgeNavigator.clearAppBadge?.();
    if (badgeUpdate) void badgeUpdate.catch(() => {});
    return () => {
      document.title = "HYFUX MIXBAR";
    };
  }, [waiting]);

  const verifiedReviews = reviews.filter(
    (r) => !r.hidden && DONE_STATUSES.includes(r.orders?.status ?? "")
  );
  const avgRating = verifiedReviews.length
    ? sum(verifiedReviews.map((r) => Number(r.rating) || 0)) / verifiedReviews.length
    : 0;

  const sales30 = useMemo(() => {
    const since = addDays(startOfDay(new Date()), -30);
    const m = new Map<string, number>();
    orders
      .filter((o) => isDone(o) && new Date(o.created_at) >= since)
      .forEach((o) =>
        (o.order_items ?? []).forEach((i) =>
          m.set(i.product_name, (m.get(i.product_name) ?? 0) + i.quantity)
        )
      );
    const rows = products
      .filter((p) => p.available !== false)
      .map((p) => ({ label: p.name, value: m.get(p.name) ?? 0 }));
    rows.sort((a, b) => b.value - a.value);
    return {
      best: rows.filter((r) => r.value > 0).slice(0, 5),
      worst: [...rows].reverse().slice(0, 5),
    };
  }, [orders, products]);

  const last7 = useMemo(() => {
    const days = eachDay(addDays(startOfDay(new Date()), -6), addDays(startOfDay(new Date()), 1)).map((d) => ({
      key: dayKey(d),
      label: dayKey(d).slice(5),
      value: 0,
    }));
    const byKey = new Map(days.map((d) => [d.key, d]));
    orders.filter(isDone).forEach((o) => {
      const d = byKey.get(dayKey(new Date(o.created_at)));
      if (d) d.value += orderTotal(o);
    });
    return days;
  }, [orders]);

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter((c): c is string => !!c))
  );

  const filteredProducts = products.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    if (q && !`${p.name} ${p.category ?? ""} ${p.description ?? ""}`.toLowerCase().includes(q)) return false;
    if (productCategory !== "all" && (p.category ?? "").toLowerCase() !== productCategory.toLowerCase()) return false;
    switch (productStatus) {
      case "visible": return p.available !== false;
      case "hidden": return p.available === false;
      case "soldout": return !!p.sold_out;
      case "featured": return !!p.featured;
      default: return true;
    }
  });
  const productFiltersOn = productSearch.trim() !== "" || productCategory !== "all" || productStatus !== "all";

  const filteredOrders = orders.filter((o) => {
    const st = o.status ?? "new";
    const q = orderSearch.trim().replace("#", "").toLowerCase();
    if (q) {
      return (
        String(o.id).toLowerCase().includes(q) ||
        (o.customers?.name ?? "").toLowerCase().includes(q)
      );
    }
    if (orderTab === "active") return ["new", "preparing", "ready"].includes(st);
    if (orderTab === "all") return true;
    if (orderTab === "delivered") return DONE_STATUSES.includes(st);
    return st === orderTab;
  });

  const navigation = [
    { name: "Overview", icon: <GridIcon size={19} /> },
    { name: "Products", icon: <BagIcon size={19} /> },
    { name: "Orders", icon: <ReceiptIcon size={19} /> },
    { name: "Analytics", icon: <TrendIcon size={19} /> },
    { name: "Finance & Profit", icon: <CoinIcon size={19} /> },
    { name: "Customers", icon: <UsersIcon size={19} /> },
    { name: "Reviews", icon: <StarIcon size={19} /> },
    { name: "Community Reviews", icon: <StarIcon size={19} /> },
    { name: "Inventory", icon: <BoxIcon size={19} /> },
    { name: "Store Settings", icon: <SlidersIcon size={19} /> },
    { name: "Security", icon: <ShieldIcon size={19} /> },
  ];

  /* ---------- Login screen ---------- */
  if (!authReady) {
    return (
      <main className="ad-shell">
        <Styles />
        <div className="ad-login-wrap">
          <p className="ad-empty">Checking session…</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="ad-shell">
        <Styles />
        <div className="ad-login-wrap">
          <form className="ad-card ad-login" onSubmit={signIn}>
            <Logo />
            <h1>
              Admin <span className="ad-gradient-text">login</span>
            </h1>
            <p className="sub">Sign in to manage your drinks and orders.</p>
            <label className="ad-field">
              <span>Email</span>
              <input className="ad-input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="ad-field">
              <span>Password</span>
              <input className="ad-input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {authError && (
              <div className="ad-notice" role="alert">
                {authError}
              </div>
            )}
            <button className="ad-btn" type="submit" disabled={signingIn}>
              {signingIn ? "Signing in…" : "Sign in"}
            </button>
            <a href="/" className="ad-store-link" style={{ justifySelf: "center" }}>
              <BackIcon size={16} /> View customer store
            </a>
          </form>
        </div>
      </main>
    );
  }

  /* ---------- Admin panel ---------- */
  return (
    <main className="ad-shell">
      <Styles />

      <aside className="ad-sidebar">
        <Logo />

        <button type="button" className="ad-menu-btn" aria-expanded={navOpen} onClick={() => setNavOpen((v) => !v)}>
          <span>{section}</span>
          {waiting > 0 && <span className="ad-menu-order-count" aria-label={`${waiting} new orders`}>{waiting} NEW</span>}
          {lowStockCount > 0 && <span className="ad-menu-low-count" aria-label={`${lowStockCount} low stock items`}>{lowStockCount} LOW</span>}
          {communityReviewCount > 0 && <span className="ad-menu-low-count" aria-label={`${communityReviewCount} pending community reviews`}>{communityReviewCount} REVIEWS</span>}
          <span>{navOpen ? "▲" : "▼"}</span>
        </button>

        <p className="ad-label">MIXBAR / CONTROL CENTER</p>

        <nav className={navOpen ? "ad-nav open" : "ad-nav"} aria-label="Admin navigation">
          {navigation.map((item) => (
            <button
              key={item.name}
              type="button"
              className={section === item.name ? "ad-nav-item active" : "ad-nav-item"}
              onClick={() => {
                setNavOpen(false);
                if ("Notification" in window && Notification.permission === "default") {
                  Notification.requestPermission();
                }
                setSection(item.name);
                setNotice("");
                setMessage("");
              }}
            >
              {item.icon}
              {item.name}
              {item.name === "Orders" && (
                <span className="ad-nav-tag">{waiting > 0 ? `${waiting} NEW` : "LIVE"}</span>
              )}
              {item.name === "Community Reviews" && communityReviewCount > 0 && (
                <span className="ad-nav-tag">{communityReviewCount} NEW</span>
              )}
              {item.name === "Inventory" && lowStockCount > 0 && (
                <span className="ad-nav-tag low">{lowStockCount} LOW STOCK</span>
              )}
            </button>
          ))}
        </nav>

        <div className="ad-sidebar-bottom">
          <span className={connected ? "ad-conn online" : "ad-conn"} role="status">
            <span className="ad-dot" />
            {connected ? "Supabase connected" : "Checking database"}
          </span>
          <a href="/" className="ad-store-link">
            <BackIcon size={16} /> View customer store
          </a>
          <button
            type="button"
            className="ad-store-link"
            style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}
            onClick={signOut}
          >
            <BackIcon size={16} /> Sign out
          </button>
        </div>
      </aside>

      <section className="ad-main">
        <header className="ad-topbar">
          <div>
            <p className="ad-eyebrow">HYFUX / Management</p>
            <h1 className="ad-title">{section}</h1>
          </div>
          <div className="ad-top-right">
            <span className={settings.is_open ? "ad-status" : "ad-status closed"}>
              <span className="ad-dot" />
              {settings.is_open ? "Shop open" : "Shop closed"}
            </span>
            <div className="ad-avatar" title={session.user.email ?? ""}>
              {(session.user.email ?? "H").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* ---------------- OVERVIEW ---------------- */}
        {section === "Overview" && (
          <>
            <div className="ad-welcome">
              <div>
                <span className="ad-chip">YOUR BUSINESS, YOUR CONTROL</span>
                <h2>
                  Make every mix <span className="ad-gradient-text">count.</span>
                </h2>
                <p>Your command center for products, orders, and shop operations.</p>
              </div>
              <div className="ad-welcome-mark">
                <LogoMark size={120} />
              </div>
            </div>

            <div className="ad-section-heading">
              <div>
                <h2>Today</h2>
                <p>Live numbers from your database</p>
              </div>
              <span className="ad-date">LIVE DATA</span>
            </div>

            <div className="ad-stats">
              <Stat icon={<ReceiptIcon size={20} />} orange label="ORDERS TODAY" value={loading ? "—" : todaysOrders.length} hint={`${waiting} waiting for you`} />
              <Stat icon={<TrendIcon size={20} />} label="SALES TODAY" value={loading ? "—" : cash(todaysRevenue)} hint="Completed orders only" />
              <Stat
                icon={<CoinIcon size={20} />}
                orange
                label="NET PROFIT TODAY"
                value={loading ? "—" : <span className={todaysNet < 0 ? "ad-neg" : ""}>{cash(todaysNet)}</span>}
                hint="After costs, refunds and expenses"
              />
              <Stat icon={<StarIcon size={20} />} label="RATING" value={verifiedReviews.length ? avgRating.toFixed(1) : "—"} hint={`${verifiedReviews.length} verified reviews`} />
            </div>

            <div className="ad-tabs" aria-label="Order status">
              <span className="ad-badge new">{waiting} waiting</span>
              <span className="ad-badge preparing">{preparing} preparing</span>
              <span className="ad-badge">{ready} ready</span>
              <span className="ad-badge delivered">{todaysDone.length} completed today</span>
            </div>

            <div className="ad-grid">
              <Panel
                title="Recent orders"
                sub="Latest activity"
                action={
                  <button type="button" className="ad-link-btn" onClick={() => setSection("Orders")}>
                    All orders <ArrowIcon size={14} />
                  </button>
                }
              >
                {loading ? (
                  <p className="ad-empty">Loading orders…</p>
                ) : orders.length === 0 ? (
                  <div className="ad-empty">
                    <ReceiptIcon size={28} />
                    <strong>No orders yet</strong>
                    <p>{message || "New customer orders will appear here instantly."}</p>
                  </div>
                ) : (
                  orders.slice(0, 6).map((o) => (
                    <div className="ad-product-row" key={o.id}>
                      <div className="ad-product-info">
                        <strong>
                          #{shortId(o.id)} · {o.customers?.name || "Customer"}
                        </strong>
                        <small>
                          {o.fulfillment === "pickup"
                            ? "Pickup"
                            : `Block ${o.customers?.block || "—"} · Room ${o.customers?.room || "—"}`} · {new Date(o.created_at).toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })}
                        </small>
                      </div>
                      <span className={`ad-badge ${o.status ?? "new"}`}>{STATUS_LABEL[o.status ?? "new"] ?? o.status}</span>
                      <span className="ad-price">{cash(orderTotal(o))}</span>
                    </div>
                  ))
                )}
              </Panel>

              <article className="ad-card ad-panel">
                <div className="ad-panel-heading">
                  <div>
                    <h3>Quick actions</h3>
                    <p>Shortcuts for daily operations</p>
                  </div>
                </div>
                <div className="ad-actions">
                  <button type="button" className="ad-action" onClick={toggleShop}>
                    <span className={settings.is_open ? "ad-icon" : "ad-icon orange"}>
                      <SlidersIcon size={19} />
                    </span>
                    <div>
                      <strong>{settings.is_open ? "Close the shop" : "Open the shop"}</strong>
                      <small>{settings.is_open ? "Customers can order right now" : "Ordering is paused for customers"}</small>
                    </div>
                    <span className="ad-arrow">
                      <ArrowIcon size={17} />
                    </span>
                  </button>
                  <button type="button" className="ad-action" onClick={() => setSection("Products")}>
                    <span className="ad-icon">
                      <BagIcon size={19} />
                    </span>
                    <div>
                      <strong>Manage products</strong>
                      <small>{products.length} drinks in your catalog</small>
                    </div>
                    <span className="ad-arrow">
                      <ArrowIcon size={17} />
                    </span>
                  </button>
                  <button type="button" className="ad-action" onClick={() => setSection("Orders")}>
                    <span className="ad-icon orange">
                      <ReceiptIcon size={19} />
                    </span>
                    <div>
                      <strong>Manage orders</strong>
                      <small>{waiting} new, waiting to be accepted</small>
                    </div>
                    <span className="ad-arrow">
                      <ArrowIcon size={17} />
                    </span>
                  </button>
                </div>
              </article>
            </div>

            <div className="ad-grid" style={{ marginTop: 20 }}>
              <Panel title="Sales, last 7 days" sub="Completed orders">
                <VBars rows={last7} fmt={cash} />
              </Panel>
              <Panel title="Best sellers" sub="Cups sold, last 30 days">
                <HBars rows={sales30.best} />
              </Panel>
            </div>

            <div className="ad-grid" style={{ marginTop: 20 }}>
              <Panel title="Low-performing drinks" sub="Fewest cups sold, last 30 days">
                <HBars rows={sales30.worst} />
              </Panel>
              <Panel title="Product catalog" sub="Latest products">
                {products.slice(0, 4).map((product) => (
                  <div className="ad-product-row" key={product.id}>
                    <div className="ad-thumb">
                      {product.image_url ? <img src={product.image_url} alt="" /> : product.name?.charAt(0)?.toUpperCase() || "D"}
                    </div>
                    <div className="ad-product-info">
                      <strong>
                        {product.name}
                        {product.available === false && <span className="ad-hidden-tag">HIDDEN</span>}
                        {product.sold_out && <span className="ad-hidden-tag">SOLD OUT</span>}
                        {product.ingredient_sold_out && <span className="ad-hidden-tag">INGREDIENTS LOW</span>}
                      </strong>
                      <small>{product.category || "No category"}</small>
                    </div>
                    <span className="ad-price">{cash(Number(product.price) || 0)}</span>
                  </div>
                ))}
                {products.length === 0 && <div className="ad-empty">No products yet.</div>}
              </Panel>
            </div>

            {message && (
              <div className="ad-notice" role="alert">
                <strong>Database notice</strong>
                {message}
              </div>
            )}
          </>
        )}

        {/* ---------------- PRODUCTS ---------------- */}
        {section === "Products" && (
          <>
            {form ? (
              <Panel title={form.id ? "Edit product" : "Add product"} sub="Changes appear in the customer store right away.">
                <form className="ad-form" onSubmit={saveProduct}>
                  <label className="ad-field">
                    <span>Name</span>
                    <input className="ad-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </label>
                  <label className="ad-field">
                    <span>Category</span>
                    <input className="ad-input" list="ad-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                    <datalist id="ad-categories">
                      {categories.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </label>
                  <label className="ad-field">
                    <span>Price (DA)</span>
                    <input className="ad-input" type="number" min="0" step="any" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  </label>
                  <label className="ad-field">
                    <span>Ingredient cost (DA)</span>
                    <input className="ad-input" type="number" min="0" step="any" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
                  </label>
                  <label className="ad-field full">
                    <span>Description</span>
                    <textarea className="ad-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </label>
                  <label className="ad-field">
                    <span>Image URL</span>
                    <input className="ad-input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
                  </label>
                  <label className="ad-field">
                    <span>Or upload a picture</span>
                    <input
                      className="ad-input"
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadImage(f);
                      }}
                    />
                  </label>

                  <div className="ad-field full">
                    <span>Customer preview</span>
                    <div className="ad-product-row" style={{ borderBottom: 0 }}>
                      <div className="ad-thumb">
                        {form.image_url ? <img src={form.image_url} alt="" /> : (form.name.charAt(0) || "D").toUpperCase()}
                      </div>
                      <div className="ad-product-info">
                        <strong>
                          {form.name || "Drink name"}
                          {(form.manual_sold_out || form.ingredient_sold_out) && <span className="ad-hidden-tag">SOLD OUT</span>}
                          {form.ingredient_sold_out && <span className="ad-hidden-tag">INGREDIENTS LOW</span>}
                          {form.featured && <span className="ad-hidden-tag ok">FEATURED</span>}
                        </strong>
                        <small>{form.description || form.category || "No description"}</small>
                      </div>
                      <span className="ad-price">{cash(Number(form.price) || 0)}</span>
                    </div>
                  </div>

                  <div className="ad-field full">
                    <span>Status</span>
                    <div className="ad-toggles">
                      <label className="ad-check">
                        <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
                        Visible to customers
                      </label>
                      <label className="ad-check">
                        <input type="checkbox" checked={form.manual_sold_out} onChange={(e) => setForm({ ...form, manual_sold_out: e.target.checked })} />
                        Manually mark sold out
                      </label>
                      <small>A drink is also marked sold out automatically when any recipe ingredient is insufficient.</small>
                      <label className="ad-check">
                        <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                        Featured special
                      </label>
                    </div>
                  </div>

                  <div className="ad-form-actions">
                    <button className="ad-btn" type="submit" disabled={saving || uploading}>
                      {saving ? "Saving…" : "Save product"}
                    </button>
                    <button type="button" className="ad-link-btn" onClick={() => setForm(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </Panel>
            ) : (
              <Panel
                title="Drinks catalog"
                sub={`${products.length} products · ${categories.length} categories`}
                action={
                  <button type="button" className="ad-btn" onClick={openNewProduct}>
                    Add product
                  </button>
                }
              >
                <div className="ad-toolbar">
                  <input className="ad-input" placeholder="Search name, category or description" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                  <select className="ad-input" style={{ maxWidth: 190 }} aria-label="Filter by category" value={productCategory} onChange={(e) => setProductCategory(e.target.value)}>
                    <option value="all">All categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select className="ad-input" style={{ maxWidth: 190 }} aria-label="Filter by status" value={productStatus} onChange={(e) => setProductStatus(e.target.value)}>
                    <option value="all">All statuses</option>
                    <option value="visible">Visible</option>
                    <option value="hidden">Hidden</option>
                    <option value="soldout">Sold out</option>
                    <option value="featured">Featured</option>
                  </select>
                  {productFiltersOn && (
                    <button type="button" className="ad-link-btn" onClick={() => { setProductSearch(""); setProductCategory("all"); setProductStatus("all"); }}>
                      Clear filters
                    </button>
                  )}
                  <small style={{ color: "var(--muted)" }}>Showing {filteredProducts.length} of {products.length}</small>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="ad-empty">
                    <BagIcon size={28} />
                    <strong>No products found</strong>
                    <p>Add your first drink with the button above.</p>
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <div className="ad-product-row" key={p.id} style={{ flexWrap: "wrap" }}>
                      <div className="ad-thumb">{p.image_url ? <img src={p.image_url} alt="" /> : p.name?.charAt(0)?.toUpperCase() || "D"}</div>
                      <div className="ad-product-info">
                        <strong>
                          {p.name}
                          {p.available === false && <span className="ad-hidden-tag">HIDDEN</span>}
                          {p.sold_out && <span className="ad-hidden-tag">SOLD OUT</span>}
                          {p.ingredient_sold_out && <span className="ad-hidden-tag">INGREDIENTS LOW</span>}
                          {p.featured && <span className="ad-hidden-tag ok">FEATURED</span>}
                        </strong>
                        <small>
                          {p.category || "No category"} · cost {cash(Number(p.cost) || 0)} · margin {cash((Number(p.price) || 0) - (Number(p.cost) || 0))}
                        </small>
                      </div>
                      <span className="ad-price">{cash(Number(p.price) || 0)}</span>
                      <div className="ad-order-btns">
                        <button type="button" className="ad-link-btn" onClick={() => toggleProduct(p, "available")}>
                          {p.available === false ? "Show" : "Hide"}
                        </button>
                        <button type="button" className="ad-link-btn" onClick={() => toggleProduct(p, "manual_sold_out")}>
                          {p.manual_sold_out ? "Clear manual sold out" : "Mark sold out manually"}
                        </button>
                        <button type="button" className="ad-link-btn" onClick={() => toggleProduct(p, "featured")}>
                          {p.featured ? "Unfeature" : "Feature"}
                        </button>
                        <button type="button" className="ad-link-btn" onClick={() => openEditProduct(p)}>
                          Edit
                        </button>
                        <button type="button" className="ad-link-btn" onClick={() => openEditProduct(p, true)}>
                          Duplicate
                        </button>
                        <button type="button" className="ad-link-btn danger" onClick={() => deleteProduct(p)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </Panel>
            )}
          </>
        )}

        {/* ---------------- ORDERS ---------------- */}
        {section === "Orders" && (
          <Panel title="Live orders" sub="New orders appear here automatically.">
            <div className="ad-toolbar">
              <input className="ad-input" placeholder="Search by order number or customer" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} />
            </div>

            <div className="ad-tabs" role="tablist">
              {[
                ["active", "Active"],
                ["new", "New"],
                ["preparing", "Preparing"],
                ["ready", "Ready"],
                ["delivered", "Delivered"],
                ["cancelled", "Cancelled"],
                ["rejected", "Rejected"],
                ["all", "All"],
              ].map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={orderTab === key} className={orderTab === key ? "ad-tab active" : "ad-tab"} onClick={() => setOrderTab(key)}>
                  {label}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="ad-empty">
                <ReceiptIcon size={28} />
                <strong>No orders here</strong>
                <p>Orders placed from the customer store will show up instantly.</p>
              </div>
            ) : (
              filteredOrders.map((o) => {
                const status = o.status ?? "new";
                const idx = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number]);
                const nextStatus = idx >= 0 ? STATUS_FLOW[idx + 1] : undefined;
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                const wa = whatsappLink(
                  o.customers?.contact,
                  `Hello ${o.customers?.name ?? ""}! Your HYFUX MIXBAR order #${shortId(o.id)} is now: ${STATUS_LABEL[o.status ?? "new"] ?? o.status}. Track it here: ${origin}/track?code=${o.id}`
                );
                const items = o.order_items ?? [];
                const open = ["new", "preparing", "ready"].includes(status);

                return (
                  <div className={status === "new" ? "ad-order is-new" : "ad-order"} key={o.id}>
                    <div className="ad-order-head">
                      <strong>Order #{shortId(o.id)}</strong>
                      <span className={`ad-badge ${status}`}>{STATUS_LABEL[status] ?? status}</span>
                    </div>

                    <div className="ad-order-meta">
                      <b>{o.customers?.name || "Customer"}</b>
                      {o.fulfillment !== "pickup" && o.customers?.block ? ` · Block ${o.customers.block}` : ""}
                      {o.fulfillment !== "pickup" && o.customers?.room ? ` · Room ${o.customers.room}` : ""}
                      {o.customers?.contact ? ` · ${o.customers.contact}` : ""}
                      <br />
                      {new Date(o.created_at).toLocaleString("fr-DZ")}
                      <br />
                      {o.fulfillment === "pickup"
                        ? "🏬 Pickup"
                        : `🛵 Delivery${Number(o.delivery_fee) > 0 ? ` (+${cash(Number(o.delivery_fee))})` : ""}`}
                      {o.notes ? (
                        <>
                          <br />
                          Customer note: {o.notes}
                        </>
                      ) : null}
                      {o.cancel_reason ? (
                        <>
                          <br />
                          Reason: {o.cancel_reason}
                        </>
                      ) : null}
                      {Number(o.refund_amount) > 0 ? (
                        <>
                          <br />
                          Refunded: {cash(Number(o.refund_amount))}
                        </>
                      ) : null}
                    </div>

                    {items.length > 0 && (
                      <div className="ad-order-items">
                        {items.map((it) => (
                          <div key={it.id}>
                            <span>
                              {it.quantity} × {it.product_name}
                            </span>
                            <span>{cash(Number(it.line_total) || 0)}</span>
                          </div>
                        ))}
                        {Number(o.discount) > 0 && (
                          <div>
                            <span>Discount</span>
                            <span>− {cash(Number(o.discount))}</span>
                          </div>
                        )}
                        {Number(o.delivery_fee) > 0 && (
                          <div>
                            <span>Delivery fee</span>
                            <span>+ {cash(Number(o.delivery_fee))}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="ad-order-foot">
                      <span className="ad-price">{cash(orderTotal(o))}</span>
                      <div className="ad-order-btns">
                        {status === "new" && (
                          <>
                            <button type="button" className="ad-btn" style={{ padding: "10px 18px" }} onClick={() => setOrderStatus(o, "preparing")}>
                              Accept
                            </button>
                            <button type="button" className="ad-link-btn danger" onClick={() => stopOrder(o, "rejected")}>
                              Reject
                            </button>
                          </>
                        )}
                        {status !== "new" && nextStatus && open && (
                          <button type="button" className="ad-btn" style={{ padding: "10px 18px" }} onClick={() => {
                            if (nextStatus === "delivered") {
                              const link = reviewRequestLink(o);
                              if (link) window.open(link, "_blank", "noopener,noreferrer");
                            }
                            setOrderStatus(o, nextStatus);
                          }}>
                            Mark {STATUS_LABEL[nextStatus].toLowerCase()}
                          </button>
                        )}
                        {open && status !== "new" && (
                          <button type="button" className="ad-link-btn danger" onClick={() => stopOrder(o, "cancelled")}>
                            Cancel
                          </button>
                        )}
                        {DONE_STATUSES.includes(status) && (
                          <button type="button" className="ad-link-btn" onClick={() => recordRefund(o)}>
                            Refund
                          </button>
                        )}
                        {DONE_STATUSES.includes(status) &&
                          (reviews.some((r) => r.order_id === o.id) ? (
                            <span className="ad-hidden-tag ok">REVIEWED</span>
                          ) : (
                            reviewRequestLink(o) && (
                              <a className="ad-link-btn" href={reviewRequestLink(o) ?? "#"} target="_blank" rel="noopener noreferrer">
                                Ask for review
                              </a>
                            )
                          ))}
                        {wa && (
                          <a className="ad-link-btn" href={wa} target="_blank" rel="noopener noreferrer">
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </Panel>
        )}

        {section === "Analytics" && <Analytics orders={orders} products={products} />}

        {section === "Finance & Profit" && (
          <Finance orders={orders} expenses={expenses} onChange={loadExpenses} onError={report} />
        )}

        {section === "Customers" && <Customers orders={orders} onChange={loadOrders} onError={report} />}

        {section === "Reviews" && <Reviews reviews={reviews} onToggle={toggleReviewHidden} />}
        {section === "Community Reviews" && <CommunityReviews onError={report} />}

        {section === "Inventory" && <Inventory orders={orders} products={products} onError={report} />}

        {section === "Store Settings" && <StoreSettings settings={settings} onSave={saveSettings} onError={report} />}

        {section === "Security" && (
          <Security session={session} connected={connected} issues={issues} onSignOut={signOut} onError={report} />
        )}

        {notice && (
          <div className="ad-notice good" role="status">
            {notice}
          </div>
        )}

        {message && section !== "Overview" && (
          <div className="ad-notice" role="alert">
            <strong>Notice</strong>
            {message}
          </div>
        )}

        <footer className="ad-footer">
          <div className="ad-tagline">Built for your next mix</div>
          <p className="ad-copy">© {currentYear ?? ""} HYFUX MIXBAR. All rights reserved.</p>
        </footer>
      </section>
    </main>
  );
}
