import type { Metadata } from 'next'

import { SHOP_IMAGES } from '@/lib/site-images'
import { site } from '@/lib/site'

export function getSiteUrl(): string {
  let raw = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  if (!raw) {
    const vercel = process.env.VERCEL_URL ?? ''
    raw = vercel ? `https://${vercel}` : 'http://localhost:3000'
  }

  return raw.replace(/\/+$/, '')
}

export function localePath(locale: string, path = ''): string {
  const suffix = path ? (path.startsWith('/') ? path : `/${path}`) : ''
  return `${getSiteUrl()}/${locale}${suffix}`
}

type PageMetadataOptions = {
  locale: string
  title: string
  description: string
  path?: string
  ogImageAlt?: string
}

export function pageMetadata({
  locale,
  title,
  description,
  path = '',
  ogImageAlt,
}: PageMetadataOptions): Metadata {
  const canonical = localePath(locale, path)
  const ogImage = `${getSiteUrl()}${SHOP_IMAGES.home}`

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        fr: localePath('fr', path),
        en: localePath('en', path),
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'fr' ? 'fr_CH' : 'en_CH',
      alternateLocale: locale === 'fr' ? ['en_CH'] : ['fr_CH'],
      url: canonical,
      siteName: site.name,
      title,
      description,
      images: [
        {
          url: ogImage,
          alt: ogImageAlt ?? site.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export function rootLayoutMetadata(
  locale: string,
  title: string,
  description: string,
): Metadata {
  return {
    metadataBase: new URL(getSiteUrl()),
    ...pageMetadata({ locale, title, description }),
    title: {
      default: title,
      template: '%s',
    },
    icons: {
      icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
      shortcut: '/favicon.svg',
      apple: '/favicon.svg',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  }
}

function openingHoursSpecification() {
  return site.openingHours.flatMap(({ days, ranges }) =>
    days.flatMap((day) =>
      ranges.map((range) => {
        const [opens, closes] = range.split('-')
        return {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: `https://schema.org/${day}`,
          opens,
          closes,
        }
      }),
    ),
  )
}

export function buildHomeJsonLd(locale: string, description: string) {
  const url = localePath(locale)
  const orgId = `${getSiteUrl()}/#organization`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${url}#website`,
        url,
        name: site.name,
        description,
        inLanguage: locale === 'fr' ? 'fr-CH' : 'en-CH',
        publisher: { '@id': orgId },
      },
      {
        '@type': ['LocalBusiness', 'GroceryStore'],
        '@id': orgId,
        name: site.name,
        description,
        url,
        image: `${getSiteUrl()}${SHOP_IMAGES.home}`,
        telephone: site.telephone,
        email: site.email,
        address: {
          '@type': 'PostalAddress',
          streetAddress: site.address.streetAddress,
          postalCode: site.address.postalCode,
          addressLocality: site.address.addressLocality,
          addressRegion: 'Valais',
          addressCountry: site.address.addressCountry,
        },
        areaServed: {
          '@type': 'AdministrativeArea',
          name: 'Ayent, Valais',
        },
        openingHoursSpecification: openingHoursSpecification(),
      },
    ],
  }
}
