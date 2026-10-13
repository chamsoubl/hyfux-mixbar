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
  featured?: boolean | null;
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

function decodeVapidPublicKey(value: string): Uint8Array {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

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
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState('');

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

    async function refreshProducts() {
      const { data, error: productsError } = await supabase
        .from('products')
        .select(
          'id, name, description, price, image_url, category, available, sold_out, featured',
        )
        .eq('available', true)
        .order('name');

      if (cancelled) return;

      if (productsError) {
        setError((previous) =>
          previous
            ? `${previous} The menu could not be loaded.`
            : 'Unable to load the menu. Please check your connection.',
        );
      } else {
        setProducts((data ?? []) as Product[]);
      }
    }

    async function refreshReviews() {
      const { data, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, rating, comment, customer_name, created_at')
        .eq('verified', true)
        .or('hidden.is.null,hidden.eq.false')
        .order('created_at', { ascending: false })
        .limit(12);

      if (!cancelled && !reviewsError) {
        setReviews((data ?? []) as Review[]);
      }
    }

    async function refreshShopStatus() {
      const { data, error: settingsError } = await supabase
        .from('business_settings')
        .select('is_open')
        .eq('id', 1)
        .maybeSingle();

      if (cancelled || settingsError || !data) return;
      setShopOpen(Boolean(data.is_open));
    }

    async function loadShop() {
      setLoading(true);
      setError('');

      const settingsResult = await supabase
        .from('business_settings')
        .select('is_open')
        .eq('id', 1)
        .maybeSingle();

      if (cancelled) return;

      if (settingsResult.error || !settingsResult.data) {
        setShopOpen(null);
        setError(
          'We could not verify shop availability. Ordering is disabled until the status is confirmed.',
        );
      } else {
        setShopOpen(Boolean(settingsResult.data.is_open));
      }

      await refreshProducts();
      if (cancelled) return;

      setLoading(false);

      // Reviews are loaded separately so a review-table issue does not
      // prevent customers from browsing the menu.
      await refreshReviews();
    }

    loadShop();

    // Keep the customer-facing status current even if the Realtime
    // subscription is unavailable or the table is not in its publication.
    const shopStatusTimer = window.setInterval(() => {
      void refreshShopStatus();
    }, 3000);

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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          void refreshProducts();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews' },
        () => {
          void refreshReviews();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(shopStatusTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker
      .getRegistration('/')
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => setPushSubscribed(Boolean(subscription)))
      .catch(() => undefined);
  }, []);

  async function toggleOpenNotifications() {
    setPushBusy(true);
    setPushMessage('');

    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('This browser does not support push notifications.');
      }
      if (!('Notification' in window)) {
        throw new Error('This browser does not support notifications.');
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      const existing = await registration.pushManager.getSubscription();

      if (existing) {
        const { error } = await supabase.functions.invoke('shop-open-push', {
          body: { action: 'unsubscribe', endpoint: existing.endpoint },
        });
        await existing.unsubscribe();
        if (error) throw error;
        setPushSubscribed(false);
        setPushMessage('Open notifications turned off.');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Allow notifications in your browser to get an alert.');
      }

      const { data: keyData, error: keyError } = await supabase.functions.invoke(
        'shop-open-push',
        { body: { action: 'public-key' } },
      );
      if (keyError) throw keyError;
      if (!keyData?.publicKey) {
        throw new Error('Open notifications are not configured yet.');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidPublicKey(keyData.publicKey) as BufferSource,
      });
      const { error: saveError } = await supabase.functions.invoke(
        'shop-open-push',
        { body: { action: 'subscribe', subscription: subscription.toJSON() } },
      );
      if (saveError) {
        await subscription.unsubscribe();
        throw saveError;
      }

      setPushSubscribed(true);
      setPushMessage('You will get a notification when the shop opens.');
    } catch (error) {
      setPushMessage(
        error instanceof Error ? error.message : 'Could not set up notifications.',
      );
    } finally {
      setPushBusy(false);
    }
  }

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

    const block = customer.block.trim();
    const room = customer.location.trim();

    if (block && !/^[A-Za-z]$/.test(block)) {
      showMessage('Block must be one letter.');
      return;
    }

    if (!/^[1-9]\d{0,2}$/.test(room) || Number(room) > 600) {
      showMessage('Room must be a number from 1 to 600.');
      return;
    }

    setSubmitting(true);
    setNotice('');

    try {
      const { data, error: orderError } = await supabase.rpc(
        'place_order',
        {
          p_name: customer.name.trim(),
          p_room: room,
          p_block: block.toUpperCase(),
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
            <div className="hx-open-alert">
              <button
                type="button"
                className="hx-open-alert-button"
                onClick={toggleOpenNotifications}
                disabled={pushBusy}
              >
                {pushBusy
                  ? 'Please wait…'
                  : pushSubscribed
                    ? 'Turn off open notifications'
                    : 'Notify me when you open'}
              </button>
              {pushMessage && (
                <small role="status" aria-live="polite">{pushMessage}</small>
              )}
            </div>
          </div>
        )}

        {shopOpen === true && pushSubscribed && (
          <div className="hx-open-alert hx-open-alert-manage">
            <button
              type="button"
              className="hx-open-alert-button"
              onClick={toggleOpenNotifications}
              disabled={pushBusy}
            >
              {pushBusy ? 'Please wait…' : 'Turn off open notifications'}
            </button>
            {pushMessage && <small role="status" aria-live="polite">{pushMessage}</small>}
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
                  <div className="hx-product-title-row">
                    <h3>{product.name}</h3>
                    {product.featured && (
                      <span className="hx-product-featured">Featured</span>
                    )}
                    {product.sold_out && (
                      <span className="hx-product-sold-out">Sold out</span>
                    )}
                  </div>

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
                type="text"
                autoCapitalize="characters"
                maxLength={1}
                pattern="[A-Za-z]"
                value={customer.block}
                onChange={(event) => {
                  const block = event.target.value
                    .replace(/[^a-z]/gi, '')
                    .slice(0, 1)
                    .toUpperCase();
                  setCustomer({ ...customer, block });
                }}
                placeholder="Your block (e.g. A, B, C)"
              />
            </label>

            <label className="hx-field-label">
              Room
              <input
                className="hx-field"
                required
                type="text"
                inputMode="numeric"
                pattern="([1-9]|[1-9][0-9]|[1-5][0-9]{2}|600)"
                title="Enter a room number from 1 to 600."
                maxLength={3}
                value={customer.location}
                onChange={(event) =>
                  setCustomer({
                    ...customer,
                    location: event.target.value.replace(/\D/g, '').slice(0, 3),
                  })
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
                disabled={
                  submitting ||
                  shopOpen !== true ||
                  cart.length === 0
                }
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
