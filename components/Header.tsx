'use client';

import { useCallback, useEffect, useId, useRef, useState, type AnimationEvent } from 'react';
import { Menu, X } from 'lucide-react';
import { APP_SCROLL_ID } from '@/lib/scroll'
import {Link, usePathname} from '@/i18n/navigation';
import {useTranslations} from 'next-intl';
import AuthLink from '@/components/AuthLink';
import CatalogueNavLink from '@/components/CatalogueNavLink';
import MemberCartLink from '@/components/MemberCartLink';
import MemberWishlistLink from '@/components/MemberWishlistLink';
import PendingMemberBadge from '@/components/PendingMemberBadge';

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function Header({locale, showAdminLink = false}: {locale: 'fr' | 'en'; showAdminLink?: boolean}) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
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
    setRendered(false);
    const scrollRoot = document.getElementById(APP_SCROLL_ID);
    if (scrollRoot) scrollRoot.style.overflow = '';
  }, [pathname]);

  const openMenu = useCallback(() => {
    setRendered(true);
    setOpen(true);
  }, []);

  const closeMenu = useCallback(({ instant = false }: { instant?: boolean } = {}) => {
    if (!open && !rendered) return;
    burgerRef.current?.focus();
    if (instant || prefersReducedMotion()) {
      setOpen(false);
      setRendered(false);
      return;
    }
    setOpen(false);
  }, [open, rendered]);

  function toggleMenu() {
    if (open) closeMenu();
    else openMenu();
  }

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
        closeMenu();
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
  }, [open, closeMenu]);

  function onOverlayAnimationEnd(e: AnimationEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (!open) setRendered(false);
  }

  const navCurrent = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) ? 'page' as const : undefined;

  return (
    <header className={rendered ? 'header header--nav-open' : 'header'} role="banner">
      <a className="skip-link" href="#main">{t('skip')}</a>

      <div className="container header-inner">
        <div className="header-actions" aria-label={t('headerActions')}>
          <div className="lang-switch" aria-label={t('langSwitch')}>
            <Link href={pathname} locale="fr" aria-current={locale === 'fr' ? 'page' : undefined}>FR</Link>
            <span aria-hidden="true">|</span>
            <Link href={pathname} locale="en" aria-current={locale === 'en' ? 'page' : undefined}>EN</Link>
          </div>
        </div>

        <Link href="/" aria-label={t('homeAria')} className="header-brand" onClick={() => closeMenu({ instant: true })}>
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
            <AuthLink locale={locale} />
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
          </div>
        </nav>

        <button
          ref={burgerRef}
          type="button"
          className="nav-toggle"
          aria-label={open ? t('menuClose') : t('menuOpen')}
          aria-controls={dialogId}
          aria-expanded={open ? 'true' : 'false'}
          onClick={toggleMenu}
        >
          <Menu size={22} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {rendered ? (
        <div
          className={open ? 'nav-overlay' : 'nav-overlay is-closing'}
          role="presentation"
          onAnimationEnd={onOverlayAnimationEnd}
        >
          <nav
            ref={dialogRef}
            id={dialogId}
            className="site-nav-mobile"
            role="dialog"
            aria-modal="true"
            aria-label={t('menu')}
          >
            <div className="nav-mobile-toolbar">
              <p className="nav-mobile-toolbar-title">{t('menu')}</p>
              <button
                type="button"
                className="nav-toggle-close"
                aria-label={t('menuClose')}
                onClick={() => closeMenu()}
              >
                <X size={22} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>

            <div className="nav-mobile-body">
              <ul className="nav-mobile-pages">
                <li><Link href="/producers" locale={locale} onClick={() => closeMenu({ instant: true })} aria-current={navCurrent('/producers')}>{t('producers')}</Link></li>
                <li><Link href="/membership" locale={locale} onClick={() => closeMenu({ instant: true })} aria-current={navCurrent('/membership')}>{t('membership')}</Link></li>
                <li><Link href="/contact" locale={locale} onClick={() => closeMenu({ instant: true })} aria-current={navCurrent('/contact')}>{t('contact')}</Link></li>
                <CatalogueNavLink locale={locale} onNavigate={() => closeMenu({ instant: true })} variant="mobile" />
              </ul>
              <div className="nav-mobile-account">
                <p className="nav-mobile-heading">{t('mySpace')}</p>
                <PendingMemberBadge locale={locale} />
                <MemberWishlistLink locale={locale} variant="mobile" />
                <MemberCartLink locale={locale} variant="mobile" />
                <div className="nav-mobile-chip-wrap" onClick={() => closeMenu({ instant: true })}>
                  <AuthLink locale={locale} />
                </div>
              </div>
              {showAdminLink ? (
                <Link
                  href="/admin"
                  locale={locale}
                  className="admin-shortcut-link admin-shortcut-link--quiet"
                  onClick={() => closeMenu({ instant: true })}
                  aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
                >
                  {t('admin')}
                </Link>
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
