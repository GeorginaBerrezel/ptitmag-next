'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export default function Footer({ locale }: { locale: 'fr' | 'en' }) {
  const t = useTranslations('footer');

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-col">
          <h3>Association Le P&apos;tit Mag</h3>
          <p>
            Rue de l&apos;Église 2<br />
            1966 St-Romain (Ayent)<br />
            Suisse
          </p>
          <p>
            {locale === 'fr' ? 'Téléphone' : 'Phone'} :{' '}
            <a href="tel:+41788664243">078 866 42 43</a>
            <br />
            Email :{' '}
            <a href="mailto:info@leptitmag.org">info@leptitmag.org</a>
          </p>
        </div>

        <div className="footer-col">
          <h4>{t('hoursTitle')}</h4>
          <p>
            {locale === 'fr' ? 'Vendredi' : 'Friday'} : 16h30 – 18h30<br />
            {locale === 'fr' ? 'Samedi' : 'Saturday'} : 09h00 – 12h00
          </p>
        </div>

        <div className="footer-col">
          <h4>{t('linksTitle')}</h4>
          <ul>
            <li><Link href="/producers" locale={locale}>{t('producers')}</Link></li>
            <li><Link href="/membership" locale={locale}>{t('membership')}</Link></li>
            <li><Link href="/contact" locale={locale}>{t('contact')}</Link></li>
          </ul>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} Association Le P&apos;tit Mag – {locale === 'fr' ? 'Sans but lucratif' : 'Non-profit'}</p>
      </div>
    </footer>
  );
}
