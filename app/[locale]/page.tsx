import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <>
      <section className="container" style={{ paddingTop: '2rem' }}>
        <h1>{t('home.title')}</h1>
        <p style={{ fontSize: '1.25rem', opacity: 0.8 }}>{t('home.subtitle')}</p>
        <p style={{ marginTop: '1rem' }}>{t('home.intro')}</p>

        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <Link href="/membership" locale={locale} className="btn">
            {t('nav.membership')}
          </Link>
          <Link href="/contact" locale={locale} className="btn btn-outline">
            {t('nav.contact')}
          </Link>
        </div>
      </section>

      <section className="container" style={{ paddingTop: '3rem' }}>
        <h2>{t('home.concept_title')}</h2>
        <p>{t('home.concept_text')}</p>
        <p>{t('home.concept_extra')}</p>
      </section>
    </>
  );
}
