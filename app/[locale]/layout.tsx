import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {Suspense} from 'react';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages, getTranslations, setRequestLocale} from 'next-intl/server';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NavigationScrollManager from '@/components/NavigationScrollManager';
import { CartProvider } from '@/lib/cart/CartContext';
import { MemberPricingProvider } from '@/lib/members/MemberPricingContext';
import { getProfile } from '@/lib/supabase/auth';
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

export default async function LocaleLayout(props: LayoutProps<'/[locale]'>) {
  const {locale} = await props.params;
  assertLocale(locale);

  setRequestLocale(locale);

  const messages = await getMessages({locale});
  const profile = await getProfile();
  const cielMarkup = profile ? applyCielMarkup(profile) : false;
  const showAdminLink = isAdminEmail(profile?.email);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <MemberPricingProvider applyCielMarkup={cielMarkup}>
        <CartProvider>
          <Suspense fallback={null}>
            <NavigationScrollManager />
          </Suspense>
          <Header locale={locale} showAdminLink={showAdminLink} />
          <div id="app-scroll">
            <main id="main">{props.children}</main>
            <Footer locale={locale} />
          </div>
        </CartProvider>
      </MemberPricingProvider>
    </NextIntlClientProvider>
  );

}
