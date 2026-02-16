import '../styles/globals.css';
import '../styles/ui.css';
import '../styles/theme.css';
import '../styles/menus.css';
import {cookies} from 'next/headers';

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const c = await cookies();
  const cookieLocale = c.get('NEXT_LOCALE')?.value;
  const lang = cookieLocale === 'en' ? 'en' : 'fr';

  return (
    <html lang={lang}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
