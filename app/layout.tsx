import AnalyticsTracking from './AnalyticsTracking';
import Script from "next/script";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./store.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HYFUX MIXBAR",
  description: "Fresh non-alcoholic mixes, delivered to your room.",
  other: {
    "google-adsense-account": "ca-pub-9123130887720244",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <Script
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9123130887720244"
        strategy="beforeInteractive"
        crossOrigin="anonymous"
      />
      <body className="min-h-full flex flex-col">
        {children}
        <AnalyticsTracking />
      </body>
    </html>
  );
}
