import type { MetadataRoute } from 'next';

function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  return raw.replace(/\/+$/, '');
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();

  // Routes statiques (ajuste si tu ajoutes d'autres pages)
  return [
    { url: `${base}/fr`, lastModified: new Date() },
    { url: `${base}/fr/producers`, lastModified: new Date() },
    { url: `${base}/fr/membership`, lastModified: new Date() },
    { url: `${base}/fr/contact`, lastModified: new Date() },

    { url: `${base}/en`, lastModified: new Date() },
    { url: `${base}/en/producers`, lastModified: new Date() },
    { url: `${base}/en/membership`, lastModified: new Date() },
    { url: `${base}/en/contact`, lastModified: new Date() },
  ];
}
