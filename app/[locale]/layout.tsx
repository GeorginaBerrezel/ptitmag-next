import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {Suspense, type ReactNode} from 'react';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages, getTranslations, setRequestLocale} from 'next-intl/server';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NavigationScrollManager from '@/components/NavigationScrollManager';
import { CartProvider } from '@/lib/cart/CartContext';
import { WishlistProvider } from '@/lib/wishlist/WishlistContext';
import { MemberPricingProvider } from '@/lib/members/MemberPricingContext';
import { getProfile, getUser } from '@/lib/supabase/auth';
import { applyCielMarkup } from '@/lib/members/profile';
import { isAdminEmail } from '@/lib/admin/access';
import { rootLayoutMetadata } from '@/lib/seo';

const LOCALES = ['fr', 'en'] as const;
type Locale = (typeof LOCALES)[number];

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });

  return rootLayoutMetadata(locale, t('title'), t('description'));
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({locale}));
}

function assertLocale(value: string): asserts value is Locale {
  if (!LOCALES.includes(value as Locale)) notFound();
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const {locale} = await params;
  assertLocale(locale);

  setRequestLocale(locale);

  const messages = await getMessages({locale});
  const [profile, user] = await Promise.all([getProfile(), getUser()]);
  const cielMarkup = profile ? applyCielMarkup(profile) : false;
  const showAdminLink = isAdminEmail(profile?.email ?? user?.email);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <MemberPricingProvider applyCielMarkup={cielMarkup}>
        <CartProvider>
          <WishlistProvider>
            <Suspense fallback={null}>
              <NavigationScrollManager />
            </Suspense>
            <Header locale={locale} showAdminLink={showAdminLink} />
            <div id="app-scroll">
              <main id="main">{children}</main>
              <Footer locale={locale} />
            </div>
          </WishlistProvider>
        </CartProvider>
      </MemberPricingProvider>
    </NextIntlClientProvider>
  );

}
