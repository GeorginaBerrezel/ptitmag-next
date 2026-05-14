'use client';

import {useEffect, useId, useState} from 'react';
import {Link, usePathname} from '@/i18n/navigation';
import {useTranslations} from 'next-intl';
import AuthLink from '@/components/AuthLink';
import CartIcon from '@/components/CartIcon';

export default function Header({locale}: {locale: 'fr' | 'en'}) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const dialogId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="header" role="banner">
      <a className="skip-link" href="#main">{t('skip')}</a>

      <div className="container header-inner">
        {/* Gauche: langue (desktop + mobile) */}
        <div className="header-actions" aria-label="Header actions">
          <div className="lang-switch" aria-label="Language switch">
            <Link href={pathname} locale="fr" aria-current={locale === 'fr' ? 'page' : undefined}>FR</Link>
            <span aria-hidden="true">|</span>
            <Link href={pathname} locale="en" aria-current={locale === 'en' ? 'page' : undefined}>EN</Link>
          </div>
        </div>

        {/* Centre: marque */}
        <Link href="/" aria-label={t('homeAria')} className="header-brand" onClick={close}>
          <span className="brand-text">Le p’tit mag</span>
        </Link>

        {/* Droite: nav desktop (mobile: cachée via CSS) */}
        
        
        <nav aria-label={t('aria')} className="site-nav-desktop">
          <ul>
            <li><Link href="/producers" locale={locale}>{t('producers')}</Link></li>
            <li><Link href="/membership" locale={locale}>{t('membership')}</Link></li>
            <li><Link href="/contact" locale={locale}>{t('contact')}</Link></li>
            <li><CartIcon locale={locale} /></li>
            <li><AuthLink locale={locale} /></li>
          </ul>
        </nav>



        {/* Droite: burger (mobile/tablette via CSS) */}
        <button
          type="button"
          className="nav-toggle"
          aria-label="Open menu"
          aria-controls={dialogId}
          aria-expanded={open ? 'true' : 'false'}
          onClick={() => setOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open ? (
        <div className="nav-overlay" role="presentation" onClick={close}>
          <nav
            id={dialogId}
            className="site-nav-mobile"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="nav-toggle nav-toggle-close"
              aria-label="Close menu"
              onClick={close}
            >
              ×
            </button>

            
            
            <div className="nav-mobile-body">
              <ul>
                <li><Link href="/producers" locale={locale} onClick={close}>{t('producers')}</Link></li>
                <li><Link href="/membership" locale={locale} onClick={close}>{t('membership')}</Link></li>
                <li><Link href="/contact" locale={locale} onClick={close}>{t('contact')}</Link></li>
                <li onClick={close}><CartIcon locale={locale} /></li>
                <li onClick={close}><AuthLink locale={locale} /></li>
              </ul>
            </div>


          </nav>
        </div>
      ) : null}
    </header>
  );
}
