'use client';

/* eslint-disable @next/next/no-img-element */

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { supabase } from '../lib/supabase';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  available: boolean;
  sold_out?: boolean | null;
};

type CartItem = {
  product: Product;
  quantity: number;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  customer_name: string | null;
  created_at: string;
};

const WHATSAPP_NUMBER = '+213669713608';

const fallbackPhotos = [
  'https://images.unsplash.com/photo-1513558161293-cdaf765edfd7?auto=format&fit=crop&w=640&q=72',
  'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=640&q=72',
  'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=640&q=72',
  'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=640&q=72',
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=640&q=72',
];

const cash = (price: number) =>
  `${Number(price || 0).toLocaleString('fr-DZ')} DA`;

const whatsappReady = () => !WHATSAPP_NUMBER.includes('X');

/* ------------------------------------------------------------------ */
/*  Brand assets                                                       */
/*  Drop your own images into /public with these names and they are    */
/*  picked up automatically. If a file is missing, a stock photo is    */
/*  shown instead, so the page never looks broken.                     */
/* ------------------------------------------------------------------ */
const HERO_IMAGE = '/hero_banner.webp';
const ABOUT_IMAGE = '/about_drinks.webp';

const SOCIAL_LINKS = {
  instagram: 'https://instagram.com/chamsou__.bl',
  tiktok: 'https://www.tiktok.com/@chamsou_.bl',
  whatsapp: `https://wa.me/${WHATSAPP_NUMBER}`,
};

const navLinks: { id: string; label: string; href?: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'menu', label: 'Menu' },
  { id: 'about', label: 'About' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'contact', label: 'Contact' },
  { id: 'track', label: 'Track Order', href: '/track' },
];

function imageFallback(fallback: string) {
  return (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.dataset.fallback === '1') return;
    image.dataset.fallback = '1';
    image.src = fallback;
  };
}

type IconProps = { size?: number };

function Svg({
  size = 20,
  children,
  fill = 'none',
}: IconProps & { children?: ReactNode; fill?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={fill === 'none' ? 'currentColor' : 'none'}
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

const LeafIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14Z" />
    <path d="M5 19 13 11" />
  </Svg>
);

const StarIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />
  </Svg>
);

const HeartIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  </Svg>
);

const CartIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 4h2.2l2.3 11h10.1L20 7.5H6.3" />
    <circle cx="9.3" cy="19.2" r="1.2" />
    <circle cx="17" cy="19.2" r="1.2" />
  </Svg>
);

const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.9 12.5h9.2L17.5 7M10 11v5.5M14 11v5.5" />
  </Svg>
);

const ArrowIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

const InstagramIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17" cy="7" r=".6" fill="currentColor" />
  </Svg>
);

const TiktokIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor">
    <path d="M16.6 3c.3 2.3 1.7 3.9 4 4.1v3.1a7.2 7.2 0 0 1-4-1.3V15a6 6 0 1 1-6-6c.3 0 .7 0 1 .1v3.2a2.9 2.9 0 1 0 1.9 2.7V3h3.1Z" />
  </Svg>
);

const WhatsAppIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor">
    <path d="M12.04 2a9.9 9.9 0 0 0-8.43 15.07L2 22l5.06-1.57A9.9 9.9 0 1 0 12.04 2Zm0 1.8a8.1 8.1 0 1 1-4.3 14.97l-.3-.19-3 .93.96-2.92-.2-.31A8.1 8.1 0 0 1 12.04 3.8Zm-3 3.9c-.2 0-.5.07-.75.35-.26.28-1 1-1 2.4s1.03 2.8 1.17 2.98c.14.2 2 3.2 4.95 4.37 2.45.97 2.95.78 3.48.73.53-.05 1.7-.7 1.94-1.37.24-.68.24-1.26.17-1.38-.07-.12-.26-.2-.55-.34-.29-.14-1.7-.84-1.96-.93-.27-.1-.46-.14-.65.14-.2.29-.75.93-.92 1.12-.17.2-.34.22-.63.07-.29-.14-1.22-.45-2.32-1.43-.86-.76-1.44-1.7-1.6-1.99-.17-.29-.02-.45.13-.59.13-.13.29-.34.43-.5.15-.17.2-.29.29-.48.1-.2.05-.36-.02-.5-.07-.15-.65-1.58-.9-2.16-.23-.56-.47-.49-.65-.5h-.55Z" />
  </Svg>
);

/* HYFUX "HF" mark, traced from the brand logo.
   Teal "H" on the left, orange "F" on the right. */
function LogoMark({ size = 46 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="3 2 42 43.5"
      aria-hidden="true"
      focusable="false"
      className="hx-logo-mark"
    >
      <defs>
        <linearGradient
          id="hxMarkTeal"
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
          id="hxMarkOrange"
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

      {/* H: top cap */}
      <path
        d="M5 3.6 21 11.2 17.2 15.9 4.9 9.6Z"
        fill="url(#hxMarkTeal)"
      />

      {/* H: stem + diagonal + inner leg */}
      <path
        d="M26.4 11.1 23.9 12.5 21.3 16.2 21 21.2 20.5 22 11.7 17.7 10.7 15.1 5.8 13.1 5 13.3 5.2 42.8 6.3 42.8 11.1 39.5 11.2 25.2 11.9 24.4 20.8 28.6 21.1 42.3 22.3 42.9 24.2 41.8 25 41.3 24.8 20.2Z"
        fill="url(#hxMarkTeal)"
      />

      {/* F */}
      <path
        d="M42.7 3.7 31.6 8.1 27 10.8 24.8 20.2 25 41.3 26.9 40.8 28.3 39.2 28.6 28.2 38.2 23.7 39.6 22.2 38.8 19.1 37.7 18.2 28.5 21.6 28 20.8 28.4 17.4 30.4 15.4 42.7 10 43.2 5Z"
        fill="url(#hxMarkOrange)"
      />
    </svg>
  );
}

function Logo() {
  return (
    <a href="#home" className="hx-logo" aria-label="HYFUX MIXBAR home">
      <LogoMark />
      <span className="hx-logo-text">
        <span className="hx-logo-name">HYFUX</span>
        <span className="hx-logo-sub">MIXBAR</span>
      </span>
    </a>
  );
}

/* Full-width bar at the very top: tells the customer at a glance
   whether they can order right now. */
function StatusBar({ shopOpen }: { shopOpen: boolean | null }) {
  const state =
    shopOpen === true ? 'open' : shopOpen === false ? 'closed' : 'unknown';

  const copy = {
    open: {
      title: "WE'RE OPEN",
      sub: 'Orders are being accepted right now.',
    },
    closed: {
      title: "WE'RE CLOSED",
      sub: 'You can browse the menu, but ordering is paused until we reopen.',
    },
    unknown: {
      title: 'CHECKING STATUS...',
      sub: 'Ordering is disabled until we confirm availability.',
    },
  }[state];

  return (
    <div className={`hx-statusbar hx-statusbar-${state}`} role="status">
      <span className="hx-status-dot" />
      <strong>{copy.title}</strong>
      <span className="hx-statusbar-sub">{copy.sub}</span>
    </div>
  );
}

function Perks() {
  const perks = [
    { icon: <LeafIcon />, top: 'Fresh', bottom: 'Ingredients' },
    { icon: <StarIcon />, top: 'Unique', bottom: 'Recipes' },
    { icon: <HeartIcon />, top: 'Non-alcoholic', bottom: 'for everyone' },
  ];

  return (
    <ul className="hx-perks">
      {perks.map((perk) => (
        <li className="hx-perk" key={perk.top}>
          <span className="hx-perk-icon">{perk.icon}</span>
          <span className="hx-perk-label">
            {perk.top}
            <br />
            {perk.bottom}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Stars({ value, label }: { value: number; label: string }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <span className="hx-stars" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= filled ? 'hx-star-on' : 'hx-star-off'}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shopOpen, setShopOpen] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState('home');

  const [customer, setCustomer] = useState({
    name: '',
    block: '',
    location: '',
    contact: '',
    notes: '',
  });

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());

    let cancelled = false;

    async function loadShop() {
      setLoading(true);
      setError('');

      const [settingsResult, productsResult] = await Promise.all([
        supabase
          .from('business_settings')
          .select('is_open')
          .eq('id', 1)
          .maybeSingle(),

        supabase
          .from('products')
          .select(
            'id, name, description, price, image_url, category, available, sold_out',
          )
          .eq('available', true)
          .order('name'),
      ]);

      if (cancelled) return;

      if (settingsResult.error || !settingsResult.data) {
        setShopOpen(null);
        setError(
          'We could not verify shop availability. Ordering is disabled until the status is confirmed.',
        );
      } else {
        setShopOpen(Boolean(settingsResult.data.is_open));
      }

      if (productsResult.error) {
        setError((previous) =>
          previous
            ? `${previous} The menu could not be loaded.`
            : 'Unable to load the menu. Please check your connection.',
        );
      } else {
        setProducts((productsResult.data ?? []) as Product[]);
      }

      setLoading(false);

      // Reviews are loaded separately so a review-table issue does not
      // prevent customers from browsing the menu.
      const reviewsResult = await supabase
        .from('reviews')
        .select('id, rating, comment, customer_name, created_at')
        .eq('verified', true)
        .order('created_at', { ascending: false })
        .limit(12);

      if (!cancelled && !reviewsResult.error) {
        setReviews((reviewsResult.data ?? []) as Review[]);
      }
    }

    loadShop();

    const channel = supabase
      .channel('hyfux-store-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_settings',
        },
        (payload) => {
          if (payload.new && 'is_open' in payload.new) {
            setShopOpen(Boolean(payload.new.is_open));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // Highlight the nav link of the section currently on screen.
  useEffect(() => {
    const elements = navLinks
      .map((link) => document.getElementById(link.id))
      .filter((element): element is HTMLElement => element !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  // Auto-dismiss short notifications (order confirmations stay visible).
  useEffect(() => {
    if (!notice || trackingCode) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice, trackingCode]);

  // Category tabs are built from the products themselves, so adding a new
  // category in the database (e.g. "Desserts") makes a new tab appear.
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    products.forEach((product) => {
      const name = (product.category ?? '').trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.set(name.toLowerCase(), name);
      }
    });
    return ['All', ...Array.from(seen.values()).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === 'All' ||
        (product.category ?? '').toLowerCase() ===
          activeCategory.toLowerCase();

      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (product.description ?? '').toLowerCase().includes(query) ||
        (product.category ?? '').toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, search]);

  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const cartTotal = cart.reduce(
    (sum, item) =>
      sum + Number(item.product.price) * item.quantity,
    0,
  );

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) /
        reviews.length
      : 0;

  function showMessage(message: string) {
    setNotice(message);
  }

  function addToCart(product: Product) {
    if (shopOpen !== true) {
      showMessage('Ordering is currently unavailable.');
      return;
    }

    if (product.sold_out) {
      showMessage(`${product.name} is sold out.`);
      return;
    }

    setCart((current) => {
      const existing = current.find(
        (item) => item.product.id === product.id,
      );

      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...current, { product, quantity: 1 }];
    });

    showMessage(`${product.name} added to your cart.`);
  }

  function changeQuantity(productId: string, amount: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + amount }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeFromCart(productId: string) {
    setCart((current) =>
      current.filter((item) => item.product.id !== productId),
    );
  }

  function buildWhatsAppMessage() {
    const lines = cart.map(
      (item) =>
        `• ${item.product.name} x${item.quantity} - ${cash(
          Number(item.product.price) * item.quantity,
        )}`,
    );

    return [
      'Hello HYFUX MIXBAR! I would like to place an order:',
      '',
      ...lines,
      '',
      `Total: ${cash(cartTotal)}`,
      '',
      `Name: ${customer.name || 'To confirm'}`,
      `Block: ${customer.block || 'To confirm'}`,
      `Room: ${customer.location || 'To confirm'}`,
      `Contact: ${customer.contact || 'To confirm'}`,
      `Notes: ${customer.notes || 'None'}`,
    ].join('\n');
  }

  function orderOnWhatsApp() {
    if (shopOpen !== true || cart.length === 0) return;

    if (!whatsappReady()) {
      showMessage(
        'Set your WhatsApp number in WHATSAPP_NUMBER at the top of this file.',
      );
      return;
    }

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      buildWhatsAppMessage(),
    )}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function submitWebsiteOrder(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (shopOpen !== true) {
      showMessage('The shop is closed or its status is unavailable.');
      return;
    }

    if (cart.length === 0) {
      showMessage('Your cart is empty.');
      return;
    }

    setSubmitting(true);
    setNotice('');

    try {
      const { data, error: orderError } = await supabase.rpc(
        'place_order',
        {
          p_name: customer.name.trim(),
          p_room: customer.location.trim(),
          p_block: customer.block.trim(),
          p_contact: customer.contact.trim(),
          p_notes: customer.notes.trim(),
          p_items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
        },
      );

      if (orderError) throw orderError;

      const code =
        typeof data === 'string'
          ? data
          : data?.tracking_code ?? data?.order_id ?? '';

      setTrackingCode(String(code));
      setCart([]);
      setShowCheckout(false);
      setShowCart(false);
      setCustomer({
        name: '',
        block: '',
        location: '',
        contact: '',
        notes: '',
      });

      showMessage('Your order was submitted successfully.');
    } catch (error) {
      console.error('Order submission failed:', error);
      const msg =
        (error as { message?: string })?.message || 'Unknown error';
      showMessage(`Order failed: ${msg}`);
      supabase.rpc('log_client_error', {
        p_source: 'checkout',
        p_message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const shopStatus =
    shopOpen === true
      ? 'OPEN NOW'
      : shopOpen === false
        ? 'CLOSED RIGHT NOW'
        : 'CHECKING STATUS';

  return (
    <main className="hyfux-page">
      <style jsx global>{`
        :root {
          --teal: #00f0e6;
          --teal-soft: #5ff7ef;
          --orange: #ff4d06;
          --bg: #03080b;
          --panel: #07151b;
          --line: rgba(0, 240, 230, 0.22);
          --text: #f4f8fa;
          --muted: #9db0b7;
          --grad: linear-gradient(100deg, #00f0e6 0%, #3dffb0 26%, #ffe45c 58%, #ff8a1f 80%, #ff4d06 100%);
          --font-display: var(--font-geist-sans), system-ui, sans-serif;
          --font-body: var(--font-geist-sans), system-ui, sans-serif;
          --font-script: 'Brush Script MT', cursive;
          color-scheme: dark;
          scroll-behavior: smooth;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        html {
          background: var(--bg);
        }

        body {
          margin: 0;
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-body);
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        button,
        input,
        textarea {
          font: inherit;
          color: inherit;
        }

        img {
          display: block;
          max-width: 100%;
        }

        h1,
        h2,
        h3,
        p {
          margin: 0;
        }

        ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        :focus-visible {
          outline: 2px solid var(--teal);
          outline-offset: 3px;
        }

        .hyfux-page {
          min-height: 100vh;
          overflow-x: clip;
          background: var(--bg);
        }

        .hx-container {
          width: min(1180px, calc(100% - 48px));
          margin-inline: auto;
        }

        .hx-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
          white-space: nowrap;
        }

        section[id],
        footer[id] {
          scroll-margin-top: 84px;
        }

        .hx-gradient-text {
          text-shadow: none;
          display: inline-block;
          padding-right: 0.04em;
          background: var(--grad);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 22px rgba(0, 240, 230, 0.22));
        }

        .hx-teal {
          color: var(--teal);
        }

        .hx-muted {
          color: var(--muted);
        }

        /* ---------- Open / closed bar ---------- */
        .hx-statusbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 6px 14px;
          padding: 10px 16px;
          font-size: 13px;
          line-height: 1.4;
          text-align: center;
          color: #021012;
        }

        .hx-statusbar strong {
          font-family: var(--font-display);
          font-weight: 900;
          letter-spacing: 0.14em;
        }

        .hx-statusbar-open {
          background: #00f0e6;
        }

        .hx-statusbar-closed {
          background: #ff4d06;
          color: #fff;
        }

        .hx-statusbar-unknown {
          background: #ffcf7b;
        }

        .hx-statusbar .hx-status-dot {
          background: currentColor;
        }

        /* ---------- Header ---------- */
        .hx-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: linear-gradient(
            180deg,
            rgba(3, 8, 11, 0.94),
            rgba(3, 8, 11, 0.78)
          );
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(0, 240, 230, 0.14);
        }

        .hx-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          height: 80px;
        }

        .hx-logo {
          display: inline-flex;
          align-items: center;
          gap: 14px;
        }

        .hx-logo-mark {
          flex: none;
          filter: drop-shadow(0 0 12px rgba(0, 240, 230, 0.22));
        }

        .hx-logo-text {
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1;
        }

        .hx-logo-name {
          font-family: var(--font-display);
          font-size: 27px;
          font-weight: 600;
          letter-spacing: 0.2em;
          color: #fff;
        }

        .hx-logo-sub {
          margin-top: 8px;
          padding-left: 0.6em;
          font-family: var(--font-display);
          font-size: 9.5px;
          font-weight: 500;
          letter-spacing: 0.6em;
          color: #dbe6ea;
        }

        .hx-nav {
          display: flex;
          gap: 38px;
        }

        .hx-nav a {
          position: relative;
          padding: 8px 0;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #d6e1e5;
          transition: color 0.2s ease;
        }

        .hx-nav a:hover {
          color: #fff;
        }

        .hx-nav a[aria-current='true'] {
          color: var(--teal);
        }

        .hx-nav a[aria-current='true']::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -6px;
          height: 2px;
          border-radius: 2px;
          background: var(--teal);
          box-shadow: 0 0 12px var(--teal);
        }

        .hx-cart-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px 11px 22px;
          border-radius: 999px;
          border: 1px solid var(--teal);
          background: rgba(0, 240, 230, 0.06);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 0 22px rgba(0, 240, 230, 0.18),
            inset 0 0 14px rgba(0, 240, 230, 0.08);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .hx-cart-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 30px rgba(0, 240, 230, 0.32),
            inset 0 0 14px rgba(0, 240, 230, 0.1);
        }

        .hx-cart-count {
          min-width: 25px;
          height: 25px;
          padding: 0 6px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: var(--teal);
          color: #021012;
          font-size: 12px;
          font-weight: 800;
        }

        /* ---------- Buttons ---------- */
        .hx-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 17px 32px;
          border-radius: 999px;
          border: 1px solid var(--teal);
          background: var(--teal);
          color: #021012;
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 10px 32px rgba(0, 240, 230, 0.28);
          transition: transform 0.2s ease, box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .hx-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 40px rgba(0, 240, 230, 0.42);
        }

        .hx-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .hx-btn-outline {
          background: transparent;
          color: var(--teal);
          box-shadow: inset 0 0 18px rgba(0, 240, 230, 0.07);
        }

        .hx-btn-outline:hover {
          background: rgba(0, 240, 230, 0.1);
          box-shadow: 0 0 28px rgba(0, 240, 230, 0.22),
            inset 0 0 18px rgba(0, 240, 230, 0.08);
        }

        .hx-btn-whatsapp {
          background: transparent;
          border-color: rgba(37, 211, 102, 0.55);
          color: #3be07f;
          box-shadow: none;
        }

        .hx-btn-whatsapp:hover {
          background: rgba(37, 211, 102, 0.1);
          box-shadow: 0 0 26px rgba(37, 211, 102, 0.2);
        }

        .hx-btn-sm {
          padding: 13px 26px;
          font-size: 11px;
        }

        .hx-btn-block {
          width: 100%;
        }

        /* ---------- Hero ---------- */
        .hx-hero {
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid rgba(0, 240, 230, 0.16);
          background: #03080b;
        }

        .hx-hero-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 72% center;
        }

        /* dark fade on the left so the text stays readable */
        .hx-hero::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(3, 8, 11, 0.92) 0%, rgba(3, 8, 11, 0.6) 34%, rgba(3, 8, 11, 0) 62%),
            linear-gradient(180deg, rgba(3, 8, 11, 0) 72%, rgba(3, 8, 11, 0.9) 100%);
          pointer-events: none;
        }

        .hx-hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
          align-items: center;
          gap: 24px;
          min-height: 560px;
          padding: 54px 0 50px;
        }

        .hx-status {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid currentColor;
          background: rgba(255, 255, 255, 0.03);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .hx-status-open {
          color: var(--teal);
          box-shadow: 0 0 22px rgba(0, 240, 230, 0.18);
        }

        .hx-status-closed {
          color: #ff7a4a;
          box-shadow: 0 0 22px rgba(255, 77, 6, 0.16);
        }

        .hx-status-unknown {
          color: #ffcf7b;
        }

        .hx-status-sep {
          width: 1px;
          height: 13px;
          background: currentColor;
          opacity: 0.45;
        }

        .hx-status-tag {
          color: #e6eef1;
          letter-spacing: 0.1em;
        }

        .hx-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          animation: hxPulse 2s ease-out infinite;
        }

        .hx-eyebrow {
          font-family: var(--font-display);
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: var(--teal);
        }

        .hx-eyebrow-dot {
          margin: 0 0.35em;
          color: #fff;
        }

        .hx-eyebrow-end {
          color: #d3dde1;
        }

        .hx-hero h1 {
          margin-top: 24px;
          font-family: var(--font-display);
          font-size: clamp(44px, 6vw, 76px);
          font-weight: 900;
          line-height: 0.98;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          text-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
        }

        .hx-hero-copy {
          max-width: 400px;
          margin-top: 24px;
          font-size: 17px;
          line-height: 1.65;
          color: #e6eef1;
        }

        .hx-hero-copy strong {
          font-weight: 600;
          color: #fff;
        }

        .hx-hero-actions {
          margin-top: 34px;
        }

        .hx-perks {
          display: flex;
          flex-wrap: wrap;
          gap: 26px;
          margin-top: 38px;
        }

        .hx-perk {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .hx-perk-icon {
          flex: none;
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1.5px solid var(--teal);
          color: var(--teal);
          background: rgba(0, 240, 230, 0.05);
          box-shadow: 0 0 18px rgba(0, 240, 230, 0.22);
        }

        .hx-perk-label {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.14em;
          line-height: 1.55;
          text-transform: uppercase;
          color: #cfdbe0;
        }

        .hx-hero-art {
          position: relative;
          align-self: stretch;
          min-height: 300px;
        }

        .hx-script {
          position: absolute;
          top: 5%;
          right: clamp(12px, 2vw, 32px);
          z-index: 2;
          font-family: var(--font-script);
          font-size: clamp(34px, 4vw, 54px);
          line-height: 0.95;
          color: var(--teal);
          text-shadow: 0 0 24px rgba(0, 240, 230, 0.55);
          transform: rotate(-9deg);
          pointer-events: none;
        }

        .hx-script span {
          display: block;
        }

        .hx-script span:nth-child(2) {
          margin-left: 0.5em;
        }

        .hx-script span:nth-child(3) {
          margin-left: 0.9em;
        }

        .hx-script svg {
          display: block;
          width: 130%;
          margin: 4px 0 0 0.1em;
        }

        /* ---------- Menu ---------- */
        .hx-menu {
          padding: 46px 0 72px;
        }

        .hx-menu-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .hx-categories {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
        }

        .hx-category {
          padding: 12px 30px;
          border-radius: 999px;
          border: 1px solid rgba(0, 240, 230, 0.28);
          background: rgba(8, 24, 30, 0.85);
          color: #d6e3e7;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease,
            box-shadow 0.2s ease;
        }

        .hx-category:hover {
          border-color: var(--teal);
        }

        .hx-category-active {
          background: var(--teal);
          border-color: var(--teal);
          color: #021012;
          font-weight: 800;
          box-shadow: 0 0 28px rgba(0, 240, 230, 0.4);
        }

        .hx-search {
          width: 230px;
          padding: 12px 20px;
          border-radius: 999px;
          border: 1px solid rgba(0, 240, 230, 0.2);
          background: rgba(8, 24, 30, 0.85);
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .hx-search::placeholder {
          color: #7f939a;
        }

        .hx-search:focus {
          border-color: var(--teal);
          box-shadow: 0 0 0 3px rgba(0, 240, 230, 0.14);
        }

        .hx-notice-panel {
          margin-top: 22px;
          padding: 16px 20px;
          border-radius: 14px;
          border: 1px solid rgba(255, 77, 6, 0.45);
          background: rgba(255, 77, 6, 0.08);
          color: #ffd9c9;
          font-size: 14px;
          line-height: 1.6;
        }

        .hx-product-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
          margin-top: 28px;
        }

        .hx-product {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid rgba(0, 240, 230, 0.22);
          background: linear-gradient(180deg, #081a21, #060f14);
          transition: transform 0.25s ease, border-color 0.25s ease,
            box-shadow 0.25s ease;
        }

        .hx-product:hover {
          transform: translateY(-6px);
          border-color: rgba(0, 240, 230, 0.6);
          box-shadow: 0 20px 46px rgba(0, 0, 0, 0.5),
            0 0 32px rgba(0, 240, 230, 0.14);
        }

        .hx-product-skeleton {
          height: 360px;
          opacity: 0.5;
          animation: hxShimmer 1.4s ease-in-out infinite;
        }

        .hx-product-photo-wrap {
          position: relative;
          aspect-ratio: 5 / 4.6;
          overflow: hidden;
        }

        .hx-product-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.55s ease;
        }

        .hx-product:hover .hx-product-photo {
          transform: scale(1.06);
        }

        .hx-product-photo-wrap::after {
          content: '';
          position: absolute;
          inset: auto 0 0 0;
          height: 46%;
          background: linear-gradient(180deg, transparent, #07151b);
        }

        .hx-product-category {
          position: absolute;
          left: 14px;
          bottom: 10px;
          z-index: 2;
          padding: 5px 12px;
          border-radius: 999px;
          border: 1px solid rgba(0, 240, 230, 0.7);
          background: rgba(2, 18, 22, 0.88);
          color: var(--teal);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .hx-product-content {
          display: flex;
          flex: 1;
          flex-direction: column;
          padding: 14px 18px 18px;
        }

        .hx-product-content h3 {
          font-size: 17px;
          font-weight: 700;
        }

        .hx-product-description {
          min-height: 40px;
          margin-top: 6px;
          font-size: 12.5px;
          line-height: 1.55;
          color: var(--muted);
        }

        .hx-price {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 800;
          color: var(--teal);
        }

        .hx-product-content .hx-price {
          margin: 14px 0 12px;
        }

        .hx-product-add {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          margin-top: auto;
          padding: 12px 16px;
          border-radius: 999px;
          border: 1px solid var(--teal);
          background: transparent;
          color: #e9f6f7;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .hx-product-add svg {
          color: var(--teal);
          transition: color 0.2s ease;
        }

        .hx-product-add:hover:not(:disabled) {
          background: var(--teal);
          color: #021012;
          box-shadow: 0 0 26px rgba(0, 240, 230, 0.35);
        }

        .hx-product-add:hover:not(:disabled) svg {
          color: #021012;
        }

        .hx-product-add:disabled {
          opacity: 0.45;
          border-color: rgba(255, 255, 255, 0.2);
          cursor: not-allowed;
        }

        .hx-empty {
          margin-top: 30px;
          padding: 54px 20px;
          border-radius: 18px;
          border: 1px dashed rgba(0, 240, 230, 0.3);
          text-align: center;
        }

        .hx-empty h3 {
          font-size: 20px;
        }

        .hx-empty p {
          margin-top: 8px;
          font-size: 14px;
          color: var(--muted);
        }

        /* ---------- About ---------- */
        .hx-about-wrap {
          border-top: 1px solid rgba(0, 240, 230, 0.16);
          border-bottom: 1px solid rgba(0, 240, 230, 0.16);
          background:
            radial-gradient(45% 80% at 85% 40%, rgba(0, 240, 230, 0.07), transparent 70%),
            #040b0e;
        }

        .hx-about {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
          align-items: stretch;
        }

        .hx-about-media {
          position: relative;
          min-height: 460px;
          overflow: hidden;
        }

        .hx-about-image {
          width: 100%;
          height: 100%;
          min-height: 460px;
          object-fit: cover;
          -webkit-mask-image: linear-gradient(90deg, #000 72%, transparent);
          mask-image: linear-gradient(90deg, #000 72%, transparent);
        }

        .hx-about-script {
          position: absolute;
          left: 5%;
          bottom: 8%;
          font-family: var(--font-script);
          font-size: clamp(26px, 3vw, 38px);
          line-height: 1;
          color: #fff;
          text-shadow: 0 2px 16px rgba(0, 0, 0, 0.7);
          transform: rotate(-9deg);
        }

        .hx-about-script span {
          display: block;
        }

        .hx-about-script span:nth-child(2) {
          margin-left: 0.6em;
        }

        .hx-about-script span:nth-child(3) {
          margin-left: 1.1em;
        }

        .hx-about-copy-wrap {
          align-self: center;
          max-width: 600px;
          padding: 64px 24px 64px 36px;
        }

        .hx-eyebrow-sm {
          font-size: 10.5px;
          letter-spacing: 0.26em;
        }

        .hx-title {
          margin-top: 12px;
          font-family: var(--font-display);
          font-size: clamp(28px, 3.6vw, 42px);
          font-weight: 900;
          line-height: 1.08;
          text-transform: uppercase;
        }

        .hx-about-copy {
          margin-top: 22px;
          max-width: 460px;
          font-size: 14px;
          line-height: 1.8;
          color: #d3dfe3;
        }

        .hx-about-copy-wrap .hx-perks {
          margin-top: 32px;
        }

        .hx-about-copy-wrap .hx-btn {
          margin-top: 32px;
        }

        /* ---------- Reviews ---------- */
        .hx-reviews {
          padding: 78px 0 72px;
        }

        .hx-section-heading {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
        }

        .hx-section-description {
          margin-top: 12px;
          max-width: 480px;
          font-size: 14.5px;
          line-height: 1.7;
          color: var(--muted);
        }

        .hx-review-summary {
          display: flex;
          align-items: center;
          gap: 24px;
          width: fit-content;
          max-width: 100%;
          margin-top: 34px;
          padding: 22px 30px;
          border-radius: 18px;
          border: 1px solid var(--line);
          background: linear-gradient(
            120deg,
            rgba(0, 240, 230, 0.08),
            rgba(255, 77, 6, 0.08)
          );
        }

        .hx-rating-number {
          font-family: var(--font-display);
          font-size: 58px;
          font-weight: 900;
          line-height: 1;
          background: var(--grad);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
        }

        .hx-stars {
          display: inline-flex;
          gap: 3px;
          font-size: 18px;
          line-height: 1;
        }

        .hx-star-on {
          color: #ff7a2e;
          text-shadow: 0 0 12px rgba(255, 77, 6, 0.55);
        }

        .hx-star-off {
          color: rgba(255, 255, 255, 0.17);
        }

        .hx-review-summary-title {
          margin-top: 8px;
          font-size: 13px;
          font-weight: 700;
        }

        .hx-review-summary-sub {
          margin-top: 4px;
          font-size: 12px;
          color: var(--muted);
        }

        .hx-review-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 20px;
          margin-top: 26px;
        }

        .hx-review-card {
          display: flex;
          flex-direction: column;
          padding: 24px;
          border-radius: 16px;
          border: 1px solid rgba(0, 240, 230, 0.2);
          background: linear-gradient(180deg, #081a21, #060f14);
          transition: transform 0.25s ease, border-color 0.25s ease;
        }

        .hx-review-card:hover {
          transform: translateY(-4px);
          border-color: rgba(0, 240, 230, 0.5);
        }

        .hx-review-card p {
          flex: 1;
          margin-top: 16px;
          font-size: 14.5px;
          line-height: 1.7;
          color: #e0e9ec;
        }

        .hx-review-name {
          margin-top: 18px;
          font-size: 13px;
          font-weight: 700;
        }

        .hx-verified {
          display: inline-flex;
          align-self: flex-start;
          margin-top: 8px;
          padding: 4px 11px;
          border-radius: 999px;
          border: 1px solid rgba(0, 240, 230, 0.45);
          color: var(--teal);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
        }

        .hx-review-empty {
          margin-top: 30px;
          padding: 40px 26px;
          border-radius: 18px;
          border: 1px solid var(--line);
          background: linear-gradient(
            120deg,
            rgba(0, 240, 230, 0.06),
            rgba(255, 77, 6, 0.06)
          );
        }

        .hx-review-empty .hx-stars {
          font-size: 22px;
        }

        .hx-review-empty h3 {
          margin-top: 14px;
          font-size: 21px;
        }

        .hx-review-empty .hx-btn {
          margin-top: 22px;
        }

        /* ---------- CTA ---------- */
        .hx-cta {
          position: relative;
          overflow: hidden;
          border-top: 1px solid rgba(0, 240, 230, 0.22);
          border-bottom: 1px solid rgba(0, 240, 230, 0.12);
          background: linear-gradient(90deg, #04141a, #031015 55%, #051a1d);
        }

        .hx-cta-inner {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) auto minmax(0, 1fr);
          align-items: center;
          gap: 34px;
          min-height: 250px;
          padding: 30px 0;
        }

        .hx-cta .hx-title {
          font-size: clamp(28px, 3.4vw, 42px);
        }

        .hx-cta-copy {
          margin-top: 10px;
          font-size: 14px;
          color: #d2dde1;
        }

        .hx-cta-gallery {
          display: flex;
          justify-content: flex-end;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 22%);
          mask-image: linear-gradient(90deg, transparent, #000 22%);
        }

        .hx-cta-gallery img {
          width: 120px;
          height: 190px;
          margin-left: -22px;
          object-fit: cover;
          border-radius: 18px;
          border: 1px solid rgba(0, 240, 230, 0.3);
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.5);
        }

        /* ---------- Footer ---------- */
        .hx-footer {
          padding: 28px 0 20px;
          background: #03090c;
        }

        .hx-footer-inner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
        }

        .hx-footer .hx-logo-mark {
          width: 40px;
          height: 40px;
        }

        .hx-footer .hx-logo-name {
          font-size: 22px;
        }

        .hx-footer .hx-logo-sub {
          font-size: 8.5px;
        }

        .hx-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 30px;
          font-size: 12px;
          color: #c8d5da;
        }

        .hx-footer-links a:hover {
          color: var(--teal);
        }

        .hx-social {
          display: flex;
          gap: 12px;
        }

        .hx-social a {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          transition: color 0.2s ease, border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .hx-social a:hover {
          color: var(--teal);
          border-color: var(--teal);
          box-shadow: 0 0 18px rgba(0, 240, 230, 0.3);
        }

        .hx-copy {
          font-size: 11px;
          color: #8da0a7;
        }

        .hx-tagline {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-top: 22px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--teal);
          white-space: nowrap;
        }

        .hx-tagline::before,
        .hx-tagline::after {
          content: '';
          flex: 1;
          height: 1px;
        }

        .hx-tagline::before {
          background: linear-gradient(90deg, var(--teal), rgba(0, 240, 230, 0.05));
        }

        .hx-tagline::after {
          background: linear-gradient(90deg, rgba(255, 77, 6, 0.05), var(--orange));
        }

        /* ---------- Cart drawer, modal, toast ---------- */
        .hx-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          justify-content: flex-end;
          background: rgba(1, 6, 8, 0.68);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }

        .hx-overlay-backdrop {
          position: absolute;
          inset: 0;
          border: 0;
          background: transparent;
          cursor: default;
        }

        .hx-drawer {
          position: relative;
          display: flex;
          flex-direction: column;
          width: min(400px, 100%);
          height: 100%;
          overflow-y: auto;
          padding: 22px 22px 26px;
          border-left: 1px solid rgba(0, 240, 230, 0.28);
          background: linear-gradient(180deg, #07151b, #040c10);
          box-shadow: -30px 0 80px rgba(0, 0, 0, 0.6);
          animation: hxSlide 0.3s ease;
        }

        .hx-drawer-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .hx-drawer-title {
          font-size: 16px;
          font-weight: 700;
        }

        .hx-icon-btn {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: #fff;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .hx-icon-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--teal);
        }

        .hx-cart-list {
          flex: 1;
        }

        .hx-cart-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }

        .hx-cart-photo {
          flex: none;
          width: 48px;
          height: 58px;
          border-radius: 8px;
          border: 1px solid rgba(0, 240, 230, 0.3);
          object-fit: cover;
        }

        .hx-cart-info {
          flex: 1;
          min-width: 0;
        }

        .hx-cart-info strong {
          display: block;
          font-size: 13px;
          font-weight: 600;
        }

        .hx-cart-unit {
          margin-top: 3px;
          font-size: 12px;
          color: var(--muted);
        }

        .hx-quantity {
          display: inline-flex;
          align-items: center;
          margin-top: 9px;
          overflow: hidden;
          border-radius: 7px;
          border: 1px solid rgba(0, 240, 230, 0.4);
        }

        .hx-quantity button {
          width: 26px;
          height: 26px;
          border: 0;
          background: transparent;
          color: var(--teal);
          cursor: pointer;
        }

        .hx-quantity button:hover:not(:disabled) {
          background: rgba(0, 240, 230, 0.14);
        }

        .hx-quantity button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .hx-quantity span {
          min-width: 28px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
        }

        .hx-cart-side {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 14px;
        }

        .hx-cart-line-total {
          font-size: 12px;
          font-weight: 700;
        }

        .hx-trash {
          padding: 6px;
          border: 0;
          background: transparent;
          color: #a8bac0;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .hx-trash:hover {
          color: var(--orange);
        }

        .hx-cart-empty {
          padding-top: 70px;
          text-align: center;
        }

        .hx-cart-empty h3 {
          margin-top: 14px;
          font-size: 19px;
        }

        .hx-cart-empty p {
          margin: 8px 0 22px;
          font-size: 14px;
          color: var(--muted);
        }

        .hx-cart-summary {
          margin-top: 18px;
        }

        .hx-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          font-size: 15px;
          font-weight: 700;
        }

        .hx-total .hx-price {
          color: #fff;
          font-size: 17px;
        }

        .hx-cart-actions {
          display: grid;
          gap: 10px;
        }

        .hx-fineprint {
          margin-top: 14px;
          font-size: 10.5px;
          line-height: 1.7;
          color: #86999f;
        }

        .hx-modal-overlay {
          justify-content: center;
          align-items: center;
          padding: 16px;
        }

        .hx-modal {
          position: relative;
          width: min(480px, 100%);
          max-height: 92vh;
          overflow-y: auto;
          padding: 26px;
          border-radius: 20px;
          border: 1px solid rgba(0, 240, 230, 0.3);
          background: linear-gradient(180deg, #08181f, #050d11);
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.65),
            0 0 40px rgba(0, 240, 230, 0.08);
          animation: hxRise 0.28s ease;
        }

        .hx-modal-total {
          margin-top: 16px;
          font-size: 14px;
          color: var(--muted);
        }

        .hx-field-label {
          display: block;
          margin-top: 16px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #b6c7cd;
        }

        .hx-field {
          display: block;
          width: 100%;
          margin-top: 8px;
          padding: 13px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: #fff;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0;
          text-transform: none;
          outline: none;
          resize: vertical;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .hx-field:focus {
          border-color: var(--teal);
          box-shadow: 0 0 0 3px rgba(0, 240, 230, 0.15);
        }

        .hx-toast {
          position: fixed;
          left: 50%;
          bottom: 24px;
          z-index: 200;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          max-width: calc(100% - 32px);
          padding: 14px 18px;
          border-radius: 14px;
          border: 1px solid rgba(0, 240, 230, 0.5);
          background: #08181f;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.6);
          font-size: 13px;
          transform: translateX(-50%);
          animation: hxRise 0.3s ease;
        }

        .hx-toast a {
          color: var(--teal);
          font-weight: 800;
        }

        .hx-toast button {
          display: grid;
          place-items: center;
          border: 0;
          background: transparent;
          color: #fff;
          cursor: pointer;
        }

        /* ---------- Animation ---------- */
        @keyframes hxPulse {
          0% {
            box-shadow: 0 0 0 0 currentColor;
          }
          70% {
            box-shadow: 0 0 0 9px transparent;
          }
          100% {
            box-shadow: 0 0 0 0 transparent;
          }
        }

        @keyframes hxSlide {
          from {
            transform: translateX(40px);
            opacity: 0;
          }
          to {
            transform: none;
            opacity: 1;
          }
        }

        @keyframes hxRise {
          from {
            opacity: 0;
            margin-top: 14px;
          }
          to {
            opacity: 1;
            margin-top: 0;
          }
        }

        @keyframes hxShimmer {
          50% {
            opacity: 0.25;
          }
        }

        /* ---------- Responsive ---------- */
        @media (max-width: 1080px) {
          .hx-product-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .hx-nav {
            gap: 26px;
          }
        }

        @media (max-width: 900px) {
          .hx-header-inner {
            flex-wrap: wrap;
            height: auto;
            padding: 12px 0;
            gap: 10px 16px;
          }

          .hx-nav {
            order: 3;
            width: 100%;
            justify-content: center;
            overflow-x: auto;
            padding-bottom: 4px;
          }

          .hx-nav a[aria-current='true']::after {
            bottom: -2px;
          }

          .hx-hero-grid,
          .hx-about,
          .hx-cta-inner {
            grid-template-columns: minmax(0, 1fr);
          }

          .hx-hero-grid {
            min-height: 0;
            padding: 48px 0 56px;
          }

          .hx-hero-art,
          .hx-script {
            display: none;
          }

          .hx-hero-bg {
            object-position: 70% center;
          }

          .hx-hero::after {
            background: linear-gradient(
              180deg,
              rgba(3, 8, 11, 0.86),
              rgba(3, 8, 11, 0.62) 55%,
              rgba(3, 8, 11, 0.92)
            );
          }

          .hx-about-media,
          .hx-about-image {
            min-height: 340px;
          }

          .hx-about-image {
            -webkit-mask-image: linear-gradient(180deg, #000 70%, transparent);
            mask-image: linear-gradient(180deg, #000 70%, transparent);
          }

          .hx-about-copy-wrap {
            max-width: none;
            padding: 40px 24px 56px;
          }

          .hx-cta-gallery {
            justify-content: center;
            -webkit-mask-image: none;
            mask-image: none;
          }

          .hx-cta-inner {
            gap: 22px;
          }
        }

        @media (max-width: 560px) {
          .hx-container {
            width: calc(100% - 32px);
          }

          .hx-statusbar-sub {
            font-size: 12px;
          }

          .hx-logo-name {
            font-size: 22px;
          }

          .hx-logo-mark {
            width: 38px;
            height: 38px;
          }

          .hx-cart-btn {
            padding: 9px 10px 9px 16px;
          }

          .hx-product-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .hx-search {
            width: 100%;
          }

          .hx-categories {
            flex-wrap: nowrap;
            overflow-x: auto;
            width: 100%;
            padding-bottom: 6px;
          }

          .hx-category {
            flex: none;
            padding: 11px 24px;
          }

          .hx-script {
            top: 0;
            font-size: 30px;
          }

          .hx-footer-inner {
            flex-direction: column;
            align-items: flex-start;
          }

          .hx-tagline {
            letter-spacing: 0.18em;
            font-size: 9px;
            gap: 10px;
          }

          .hx-cta-gallery img:nth-child(3) {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          :root {
            scroll-behavior: auto;
          }

          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* OPEN / CLOSED BAR */}
      <StatusBar shopOpen={shopOpen} />

      {/* HEADER */}
      <header className="hx-header">
        <div className="hx-container hx-header-inner">
          <Logo />

          <nav className="hx-nav" aria-label="Main navigation">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href ?? `#${link.id}`}
                aria-current={activeSection === link.id ? 'true' : undefined}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <button
            type="button"
            className="hx-cart-btn"
            onClick={() => setShowCart(true)}
            aria-label={`Open cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
          >
            <CartIcon size={19} />
            My Cart
            <span className="hx-cart-count">{cartCount}</span>
          </button>
        </div>
      </header>

      {/* HERO */}
      <section id="home" className="hx-hero">
        <img
          className="hx-hero-bg"
          src={HERO_IMAGE}
          onError={imageFallback(fallbackPhotos[0])}
          alt="A colourful HYFUX mocktail served over ice"
          fetchPriority="high"
          decoding="async"
        />

        <div className="hx-container hx-hero-grid">
          <div>
            <span
              className={`hx-status ${
                shopOpen === true
                  ? 'hx-status-open'
                  : shopOpen === false
                    ? 'hx-status-closed'
                    : 'hx-status-unknown'
              }`}
              role="status"
            >
              <span className="hx-status-dot" />
              {shopStatus}
              {shopOpen === true && (
                <>
                  <span className="hx-status-sep" aria-hidden="true" />
                  <span className="hx-status-tag">
                    Fresh drinks, made for you
                  </span>
                </>
              )}
            </span>

            <h1>
              More than
              <br />
              just a <span className="hx-gradient-text">drink</span>
            </h1>

            <p className="hx-hero-copy">
              Refreshing. Unique. Unforgettable.
              <br />
              Discover our signature mixes and find your new favourite drink.
            </p>

            <div className="hx-hero-actions">
              <a href="#menu" className="hx-btn">
                Explore our menu <ArrowIcon size={18} />
              </a>
            </div>

            <Perks />
          </div>

          <div className="hx-hero-art" />
        </div>

        <div className="hx-script" aria-hidden="true">
          <span>Good</span>
          <span>Vibes</span>
          <span>Only</span>
          <svg viewBox="0 0 160 20" fill="none">
            <path
              d="M4 16C40 6 100 2 156 4"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </section>

      {/* MENU */}
      <section id="menu" className="hx-container hx-menu">
        <h2 className="hx-sr-only">Our menu</h2>

        <div className="hx-menu-bar">
          <div className="hx-categories" aria-label="Filter menu by category">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                onClick={() => setActiveCategory(category)}
                aria-pressed={activeCategory === category}
                className={`hx-category ${
                  activeCategory === category ? 'hx-category-active' : ''
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <input
            className="hx-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search drinks..."
            aria-label="Search drinks"
          />
        </div>

        {shopOpen === false && (
          <div className="hx-notice-panel" role="status">
            <strong>We&apos;re taking a little break.</strong>
            <br />
            The menu is still available to browse, but ordering is paused
            until the shop reopens.
          </div>
        )}

        {shopOpen === null && !loading && (
          <div className="hx-notice-panel" role="status">
            We could not confirm the shop&apos;s current status. Ordering is
            disabled until it can be verified.
          </div>
        )}

        {error && (
          <p role="alert" className="hx-notice-panel">
            {error}
          </p>
        )}

        {loading ? (
          <div className="hx-product-grid">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="hx-product hx-product-skeleton" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="hx-empty">
            <h3>
              {products.length === 0
                ? 'Your menu is being prepared.'
                : 'No drinks match your search.'}
            </h3>
            <p>
              {products.length === 0
                ? 'Available products added through the admin dashboard will appear here.'
                : 'Try another search or category.'}
            </p>
            {products.length > 0 && (
              <button
                type="button"
                className="hx-btn hx-btn-outline hx-btn-sm"
                style={{ marginTop: 18 }}
                onClick={() => {
                  setSearch('');
                  setActiveCategory('All');
                }}
              >
                Show all drinks
              </button>
            )}
          </div>
        ) : (
          <div className="hx-product-grid">
            {filteredProducts.map((product, index) => (
              <article
                className="hx-product"
                key={product.id}
                style={product.sold_out ? { opacity: 0.55 } : undefined}
              >
                <div className="hx-product-photo-wrap">
                  <img
                    className="hx-product-photo"
                    src={
                      product.image_url ||
                      fallbackPhotos[index % fallbackPhotos.length]
                    }
                    onError={imageFallback(
                      fallbackPhotos[index % fallbackPhotos.length],
                    )}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="hx-product-category">
                    {product.category || 'HYFUX Signature'}
                  </span>
                </div>

                <div className="hx-product-content">
                  <h3>{product.name}</h3>

                  <p className="hx-product-description">
                    {product.description ||
                      'A refreshing HYFUX creation, prepared for your moment.'}
                  </p>

                  <span className="hx-price">
                    {cash(Number(product.price))}
                  </span>

                  <button
                    type="button"
                    className="hx-product-add"
                    disabled={shopOpen !== true || !!product.sold_out}
                    onClick={() => addToCart(product)}
                  >
                    <CartIcon size={17} />
                    {product.sold_out
                      ? 'Sold out'
                      : shopOpen === true
                      ? 'Add to cart'
                      : shopOpen === false
                        ? 'Closed – ordering paused'
                        : 'Checking status...'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ABOUT */}
      <section id="about" className="hx-about-wrap">
        <div className="hx-about">
          <div className="hx-about-media">
            <img
              className="hx-about-image"
              src={ABOUT_IMAGE}
              onError={imageFallback(fallbackPhotos[2])}
              alt="A selection of colourful HYFUX drinks"
              loading="lazy"
              decoding="async"
            />
            <div className="hx-about-script" aria-hidden="true">
              <span>Crafted</span>
              <span>for your</span>
              <span>moments</span>
            </div>
          </div>

          <div className="hx-about-copy-wrap">
            <p className="hx-eyebrow hx-eyebrow-sm">About HYFUX MIXBAR</p>
            <h2 className="hx-title">
              A mix of passion,
              <br />
              flavour &amp; <span className="hx-teal">good vibes</span>
            </h2>

            <p className="hx-about-copy">
              At HYFUX MIXBAR, we create more than just drinks. We create
              moments. Our unique blends, fresh ingredients and bold flavours
              are designed to bring people together and make every sip
              special.
            </p>

            <Perks />

            <a href="#reviews" className="hx-btn hx-btn-outline hx-btn-sm">
              See reviews <ArrowIcon size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* CUSTOMER REVIEWS */}
      <section id="reviews" className="hx-container hx-reviews">
        <div className="hx-section-heading">
          <div>
            <p className="hx-eyebrow hx-eyebrow-sm">Real experiences</p>
            <h2 className="hx-title">
              The love is <span className="hx-gradient-text">real</span>
            </h2>
            <p className="hx-section-description">
              Feedback from customers who have experienced HYFUX.
            </p>
          </div>

          <a href="/track" className="hx-btn hx-btn-outline hx-btn-sm">
            Track your order <ArrowIcon size={16} />
          </a>
        </div>

        {reviews.length > 0 ? (
          <>
            <div className="hx-review-summary">
              <div className="hx-rating-number">
                {averageRating.toFixed(1)}
              </div>

              <div>
                <Stars
                  value={averageRating}
                  label={`${averageRating.toFixed(1)} out of 5 stars`}
                />
                <div className="hx-review-summary-title">
                  Verified customer ratings
                </div>
                <div className="hx-review-summary-sub">
                  Based on {reviews.length} published review
                  {reviews.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            <div className="hx-review-grid">
              {reviews.slice(0, 6).map((review) => (
                <article className="hx-review-card" key={review.id}>
                  <Stars
                    value={review.rating}
                    label={`${review.rating} out of 5 stars`}
                  />

                  <p>
                    {review.comment?.trim()
                      ? `\u201C${review.comment.trim()}\u201D`
                      : 'Customer rating submitted.'}
                  </p>

                  <div className="hx-review-name">
                    {review.customer_name || 'HYFUX customer'}
                  </div>

                  <span className="hx-verified">✓ Verified customer</span>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="hx-review-empty">
            <Stars value={0} label="No ratings yet" />
            <h3>Your review could be next.</h3>
            <p className="hx-section-description">
              Customer reviews will appear here after verified orders have
              been reviewed and published.
            </p>
            <a href="/track" className="hx-btn hx-btn-outline hx-btn-sm">
              Find your order
            </a>
          </div>
        )}
      </section>

      {/* CALL TO ACTION */}
      <section className="hx-cta">
        <div className="hx-container hx-cta-inner">
          <div>
            <p className="hx-eyebrow hx-eyebrow-sm">
              Your next favourite is waiting
            </p>
            <h2 className="hx-title">
              Ready to find <span className="hx-teal">your mix?</span>
            </h2>
            <p className="hx-cta-copy">
              Explore our menu and choose a drink that matches your mood.
            </p>
          </div>

          <a href="#menu" className="hx-btn">
            Explore menu <ArrowIcon size={18} />
          </a>

          <div className="hx-cta-gallery" aria-hidden="true">
            <img src={fallbackPhotos[1]} alt="" loading="lazy" />
            <img src={fallbackPhotos[3]} alt="" loading="lazy" />
            <img src={fallbackPhotos[4]} alt="" loading="lazy" />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="hx-footer">
        <div className="hx-container">
          <div className="hx-footer-inner">
            <Logo />

            <nav className="hx-footer-links" aria-label="Footer navigation">
              <a href="#home">Home</a>
              <a href="#menu">Menu</a>
              <a href="#about">About</a>
              <a href="#reviews">Reviews</a>
              <a href="/track">Track order</a>
              <a href="/admin">Admin</a>
            </nav>

            <div className="hx-social">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="HYFUX on Instagram"
              >
                <InstagramIcon size={18} />
              </a>
              <a
                href={SOCIAL_LINKS.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="HYFUX on TikTok"
              >
                <TiktokIcon size={18} />
              </a>
              <a
                href={SOCIAL_LINKS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with HYFUX on WhatsApp"
              >
                <WhatsAppIcon size={18} />
              </a>
            </div>

            <span className="hx-copy">
              © {currentYear ?? ''} HYFUX MIXBAR. All rights reserved.
            </span>
          </div>

          <div className="hx-tagline">
            Drinks <span aria-hidden="true">•</span> Good Vibes{' '}
            <span aria-hidden="true">•</span> Always
          </div>
        </div>
      </footer>

      {/* TOAST / ORDER CONFIRMATION */}
      {notice && (
        <div role="status" className="hx-toast">
          <span>{notice}</span>
          {trackingCode && (
            <a href={`/track?code=${encodeURIComponent(trackingCode)}`}>
              Track order →
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setNotice('');
              setTrackingCode('');
            }}
            aria-label="Dismiss notification"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      )}

      {/* CART DRAWER */}
      {showCart && (
        <div className="hx-overlay">
          <button
            type="button"
            aria-label="Close cart"
            className="hx-overlay-backdrop"
            onClick={() => setShowCart(false)}
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Your shopping cart"
            className="hx-drawer"
          >
            <div className="hx-drawer-head">
              <h2 className="hx-drawer-title">Your Cart ({cartCount})</h2>

              <button
                type="button"
                className="hx-icon-btn"
                onClick={() => setShowCart(false)}
                aria-label="Close cart"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            {shopOpen !== true && (
              <div className="hx-notice-panel" style={{ marginTop: 16 }}>
                {shopOpen === false
                  ? 'The shop is closed. New orders are paused.'
                  : 'Shop status is not confirmed. Ordering is disabled.'}
              </div>
            )}

            <div className="hx-cart-list">
              {cart.length === 0 ? (
                <div className="hx-cart-empty">
                  <div style={{ fontSize: 44 }}>🥤</div>
                  <h3>Your cart is waiting.</h3>
                  <p>Choose a drink from the menu to get started.</p>
                  <button
                    type="button"
                    className="hx-btn hx-btn-sm"
                    onClick={() => {
                      setShowCart(false);
                      document
                        .getElementById('menu')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Browse the menu
                  </button>
                </div>
              ) : (
                cart.map((item, index) => (
                  <div className="hx-cart-row" key={item.product.id}>
                    <img
                      className="hx-cart-photo"
                      src={
                        item.product.image_url ||
                        fallbackPhotos[index % fallbackPhotos.length]
                      }
                      onError={imageFallback(
                        fallbackPhotos[index % fallbackPhotos.length],
                      )}
                      alt={item.product.name}
                      loading="lazy"
                      decoding="async"
                    />

                    <div className="hx-cart-info">
                      <strong>{item.product.name}</strong>
                      <div className="hx-cart-unit">
                        {cash(Number(item.product.price))}
                      </div>

                      <div className="hx-quantity">
                        <button
                          type="button"
                          aria-label={`Remove one ${item.product.name}`}
                          onClick={() => changeQuantity(item.product.id, -1)}
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Add one ${item.product.name}`}
                          disabled={shopOpen !== true}
                          onClick={() => addToCart(item.product)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="hx-cart-side">
                      <span className="hx-cart-line-total">
                        {cash(Number(item.product.price) * item.quantity)}
                      </span>
                      <button
                        type="button"
                        className="hx-trash"
                        onClick={() => removeFromCart(item.product.id)}
                        aria-label={`Remove ${item.product.name} from cart`}
                      >
                        <TrashIcon size={17} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="hx-cart-summary">
                <div className="hx-total">
                  <span>Total</span>
                  <span className="hx-price">{cash(cartTotal)}</span>
                </div>

                <div className="hx-cart-actions">
                  <button
                    type="button"
                    className="hx-btn hx-btn-sm hx-btn-block"
                    disabled={shopOpen !== true}
                    onClick={() => {
                      setShowCart(false);
                      setShowCheckout(true);
                    }}
                  >
                    Checkout
                  </button>

                  <button
                    type="button"
                    className="hx-btn hx-btn-sm hx-btn-whatsapp hx-btn-block"
                    disabled={shopOpen !== true}
                    onClick={orderOnWhatsApp}
                  >
                    Order through WhatsApp
                  </button>

                  <button
                    type="button"
                    className="hx-btn hx-btn-sm hx-btn-outline hx-btn-block"
                    onClick={() => setShowCart(false)}
                  >
                    Continue browsing
                  </button>
                </div>

                <p className="hx-fineprint">
                  WhatsApp opens a prepared message for you to review and
                  send. Your order is not confirmed until the shop replies.
                </p>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* WEBSITE CHECKOUT */}
      {showCheckout && (
        <div className="hx-overlay hx-modal-overlay">
          <form
            onSubmit={submitWebsiteOrder}
            className="hx-modal"
            aria-label="Complete your order"
          >
            <div className="hx-drawer-head">
              <div>
                <p className="hx-eyebrow hx-eyebrow-sm">Almost there</p>
                <h2 className="hx-drawer-title" style={{ marginTop: 8, fontSize: 21 }}>
                  Complete your order
                </h2>
              </div>

              <button
                type="button"
                className="hx-icon-btn"
                onClick={() => setShowCheckout(false)}
                aria-label="Close checkout"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <p className="hx-modal-total">
              Order total:{' '}
              <strong className="hx-price" style={{ fontSize: 17 }}>
                {cash(cartTotal)}
              </strong>
            </p>

            <label className="hx-field-label">
              Your name
              <input
                className="hx-field"
                required
                autoComplete="name"
                value={customer.name}
                onChange={(event) =>
                  setCustomer({ ...customer, name: event.target.value })
                }
                placeholder="Full name"
              />
            </label>

            <label className="hx-field-label">
              Block
              <input
                className="hx-field"
                value={customer.block}
                onChange={(event) =>
                  setCustomer({ ...customer, block: event.target.value })
                }
                placeholder="Your block (e.g. A, B, C)"
              />
            </label>

            <label className="hx-field-label">
              Room
              <input
                className="hx-field"
                required
                value={customer.location}
                onChange={(event) =>
                  setCustomer({ ...customer, location: event.target.value })
                }
                placeholder="Your room number"
              />
            </label>

            <label className="hx-field-label">
              Phone number
              <input
                className="hx-field"
                required
                type="tel"
                autoComplete="tel"
                value={customer.contact}
                onChange={(event) =>
                  setCustomer({ ...customer, contact: event.target.value })
                }
                placeholder="Your phone number"
              />
            </label>

            <label className="hx-field-label">
              Notes (optional)
              <textarea
                className="hx-field"
                rows={3}
                value={customer.notes}
                onChange={(event) =>
                  setCustomer({ ...customer, notes: event.target.value })
                }
                placeholder="Ice, sugar, or delivery instructions"
              />
            </label>

            <div className="hx-cart-actions" style={{ marginTop: 22 }}>
              <button
                type="submit"
                className="hx-btn hx-btn-block"
                disabled={submitting || shopOpen !== true || cart.length === 0}
              >
                {submitting ? 'Submitting order...' : 'Place order'}
              </button>

              <button
                type="button"
                className="hx-btn hx-btn-whatsapp hx-btn-block"
                disabled={submitting || shopOpen !== true || cart.length === 0}
                onClick={orderOnWhatsApp}
              >
                Or order through WhatsApp
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
