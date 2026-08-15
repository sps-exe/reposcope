import siteConfig from '@/site.config';
import type { Metadata } from 'next';
import './globals.css';
import Script from 'next/script';
import { Space_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";
import { BRAND, BRAND_DESCRIPTION, BRAND_DOMAIN, BRAND_NAME } from '@/lib/brand';
import { QueryProvider } from '@/components/providers/query-provider';
import { AppShell } from '@/components/app-shell';
import { OrganizationJsonLd, SiteNavigationJsonLd, WebSiteJsonLd } from '@/components/json-ld';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || BRAND_DOMAIN),
  title: {
    default: `${BRAND_NAME} — ${BRAND.tagline}`,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  icons: ['/favicon.svg'],
  openGraph: {
    siteName: BRAND_NAME,
    locale: 'en_US',
    type: 'website',
    title: `${BRAND_NAME} — ${BRAND.tagline}`,
    description: BRAND_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    creator: `@${BRAND.twitter}`,
    title: `${BRAND_NAME} — ${BRAND.tagline}`,
    description: BRAND_DESCRIPTION,
  },
  alternates: {
    canonical: '/',
  },
};

const GTAG_ID = siteConfig.ga.tag;

export default function RootLayout ({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn("font-sans", spaceGrotesk.variable)}>
    <head>
      {/* Preconnect to external domains for Core Web Vitals improvement */}
      <link rel="preconnect" href="https://avatars.githubusercontent.com" />
      <link rel="dns-prefetch" href="https://avatars.githubusercontent.com" />
      <link rel="preconnect" href="https://github.com" />
      <link rel="dns-prefetch" href="https://github.com" />
      <link rel="preconnect" href={BRAND_DOMAIN} />
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-friendly site description" />
      <link rel="alternate" type="text/plain" href="/llms-full.txt" title="LLM-friendly full documentation" />
      <link rel="search" type="application/opensearchdescription+xml" href="/opensearch.xml" title="Reposcope" />
    </head>
    <body
      // className={inter.className}
    >
    <OrganizationJsonLd />
    <WebSiteJsonLd />
    <SiteNavigationJsonLd />
    <QueryProvider>
    <Script id="google-analytics" src={`https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`} />
    <Script id="google-analytics-config">
      {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
 
          gtag('config', '${GTAG_ID}');
        `}
    </Script>
    <AppShell>{children}</AppShell>
    </QueryProvider>
    </body>
    </html>
  );
}
