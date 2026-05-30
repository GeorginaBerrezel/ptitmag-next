import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {Suspense} from 'react';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NavigationScrollManager from '@/components/NavigationScrollManager';
import { CartProvider } from '@/lib/cart/CartContext';
import { MemberPricingProvider } from '@/lib/members/MemberPricingContext';
import { getProfile } from '@/lib/supabase/auth';
import { applyCielMarkup } from '@/lib/members/profile';

const LOCALES = ['fr', 'en'] as const;
type Locale = (typeof LOCALES)[number];

export const dynamic = 'force-dynamic';

function getSiteUrl(): string {
  let raw = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  if (!raw) {
    const vercel = process.env.VERCEL_URL ?? '';
    raw = vercel ? 'https://' + vercel : 'http://localhost:3000';
  }

  return raw.replace(/\/+$/, '');
}

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({locale}));
}

function assertLocale(value: string): asserts value is Locale {
  if (!LOCALES.includes(value as Locale)) notFound();
}

export default async function LocaleLayout(props: LayoutProps<'/[locale]'>) {
  const {locale} = await props.params;
  assertLocale(locale);

  setRequestLocale(locale);

  const messages = await getMessages({locale});
  const profile = await getProfile();
  const cielMarkup = profile ? applyCielMarkup(profile) : false;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <MemberPricingProvider applyCielMarkup={cielMarkup}>
        <CartProvider>
          <Suspense fallback={null}>
            <NavigationScrollManager />
          </Suspense>
          <Header locale={locale} />
          <div id="app-scroll">
            <main id="main">{props.children}</main>
            <Footer locale={locale} />
          </div>
        </CartProvider>
      </MemberPricingProvider>
    </NextIntlClientProvider>
  );

}
