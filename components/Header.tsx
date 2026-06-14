'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { APP_SCROLL_ID } from '@/lib/scroll'
import {Link, usePathname} from '@/i18n/navigation';
import {useTranslations} from 'next-intl';
import AuthLink from '@/components/AuthLink';
import CatalogueNavLink from '@/components/CatalogueNavLink';
import MemberCartLink from '@/components/MemberCartLink';
import MemberWishlistLink from '@/components/MemberWishlistLink';
import PendingMemberBadge from '@/components/PendingMemberBadge';

export default function Header({locale, showAdminLink = false}: {locale: 'fr' | 'en'; showAdminLink?: boolean}) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const dialogId = useId();
  const burgerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const scrollRoot = document.getElementById(APP_SCROLL_ID);
    const prev = scrollRoot?.style.overflow ?? '';
    if (scrollRoot) scrollRoot.style.overflow = 'hidden';
    return () => {
      if (scrollRoot) scrollRoot.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
    const scrollRoot = document.getElementById(APP_SCROLL_ID);
    if (scrollRoot) scrollRoot.style.overflow = '';
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        burgerRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || focusable.length === 0) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function close() {
    setOpen(false);
    burgerRef.current?.focus();
  }

  const navCurrent = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) ? 'page' as const : undefined;

  return (
    <header className="header" role="banner">
      <a className="skip-link" href="#main">{t('skip')}</a>

      <div className="container header-inner">
        <div className="header-actions" aria-label={t('headerActions')}>
          <div className="lang-switch" aria-label={t('langSwitch')}>
            <Link href={pathname} locale="fr" aria-current={locale === 'fr' ? 'page' : undefined}>FR</Link>
            <span aria-hidden="true">|</span>
            <Link href={pathname} locale="en" aria-current={locale === 'en' ? 'page' : undefined}>EN</Link>
          </div>
        </div>

        <Link href="/" aria-label={t('homeAria')} className="header-brand" onClick={close}>
          <span className="brand-text">Le p’tit mag</span>
        </Link>

        <nav aria-label={t('aria')} className="site-nav-desktop">
          <ul>
            <li><Link href="/producers" locale={locale} aria-current={navCurrent('/producers')}>{t('producers')}</Link></li>
            <li><Link href="/membership" locale={locale} aria-current={navCurrent('/membership')}>{t('membership')}</Link></li>
            <li><Link href="/contact" locale={locale} aria-current={navCurrent('/contact')}>{t('contact')}</Link></li>
            <CatalogueNavLink locale={locale} />
          </ul>
          <div className="header-account">
            <PendingMemberBadge locale={locale} />
            <MemberWishlistLink locale={locale} />
            <MemberCartLink locale={locale} />
            {showAdminLink ? (
              <Link
                href="/admin"
                locale={locale}
                className="admin-shortcut-link"
                aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
              >
                {t('admin')}
              </Link>
            ) : null}
            <AuthLink locale={locale} />
          </div>
        </nav>

        <button
          ref={burgerRef}
          type="button"
          className="nav-toggle"
          aria-label={open ? t('menuClose') : t('menuOpen')}
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
            ref={dialogRef}
            id={dialogId}
            className="site-nav-mobile"
            role="dialog"
            aria-modal="true"
            aria-label={t('menu')}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="nav-toggle nav-toggle-close"
              aria-label={t('menuClose')}
              onClick={close}
            >
              ×
            </button>

            <div className="nav-mobile-body">
              <ul>
                <li><Link href="/producers" locale={locale} onClick={close} aria-current={navCurrent('/producers')}>{t('producers')}</Link></li>
                <li><Link href="/membership" locale={locale} onClick={close} aria-current={navCurrent('/membership')}>{t('membership')}</Link></li>
                <li><Link href="/contact" locale={locale} onClick={close} aria-current={navCurrent('/contact')}>{t('contact')}</Link></li>
                <CatalogueNavLink locale={locale} onNavigate={close} variant="mobile" />
              </ul>
              <div className="nav-mobile-account">
                <PendingMemberBadge locale={locale} />
                <MemberWishlistLink locale={locale} />
                <MemberCartLink locale={locale} />
                {showAdminLink ? (
                  <Link
                    href="/admin"
                    locale={locale}
                    className="admin-shortcut-link"
                    onClick={close}
                    aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
                  >
                    {t('admin')}
                  </Link>
                ) : null}
                <div onClick={close}>
                  <AuthLink locale={locale} />
                </div>
              </div>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
