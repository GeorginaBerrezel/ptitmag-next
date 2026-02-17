import { getTranslations } from 'next-intl/server';
import { Hero } from '@/components/hero/Hero';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return <Hero locale={locale} t={t} />;
}
