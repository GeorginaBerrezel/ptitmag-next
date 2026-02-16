import type {Metadata} from 'next';
import {notFound} from 'next/navigation';

import {NextIntlClientProvider} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';

import Header from '@/components/Header';
import Footer from '@/components/Footer';

const LOCALES = ['fr', 'en'] as const;
type Locale = (typeof LOCALES)[number];

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

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Header locale={locale} />
          <main id="main">{props.children}</main>
          <Footer locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
