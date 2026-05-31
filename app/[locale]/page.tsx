import { getTranslations } from 'next-intl/server';
import { Hero } from '@/components/hero/Hero';
import FeaturedProducts from '@/components/FeaturedProducts';
import JsonLdScript from '@/components/seo/JsonLdScript';
import { buildHomeJsonLd, pageMetadata } from '@/lib/seo';

export type StepDetail   = { title: string; desc: string }
export type TrialContent = { title: string; text: string; cta: string; note: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });

  return pageMetadata({
    locale,
    title: t('title'),
    description: t('description'),
    ogImageAlt: t('ogAlt'),
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const stepsDetail  = t.raw('home.how_steps_detail') as StepDetail[];
  const trialContent: TrialContent = {
    title: t('home.trial_title'),
    text:  t('home.trial_text'),
    cta:   t('home.trial_cta'),
    note:  t('home.trial_note'),
  };

  const tSeo = await getTranslations({ locale, namespace: 'seo' });

  return (
    <>
      <JsonLdScript data={buildHomeJsonLd(locale, tSeo('description'))} />
      {/* Hero principal */}
      <Hero locale={locale} t={t} stepsDetail={stepsDetail} trialContent={trialContent} />

      {/* Produits éphémères — bandeau compact, uniquement s'il y en a */}
      <FeaturedProducts locale={locale} />
    </>
  );
}
