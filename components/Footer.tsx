'use client';

import { Link } from '@/i18n/navigation';

export default function Footer({ locale }: { locale: 'fr' | 'en' }) {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-col">
          <h3>Association Le P’tit Mag</h3>
          <p>
            Rue de l’Église 2<br />
            1966 St-Romain (Ayent)<br />
            Suisse
          </p>
          <p>
            Téléphone : 078 866 42 43<br />
            Email : info@leptitmag.org
          </p>
        </div>

        <div className="footer-col">
          <h4>Horaires</h4>
          <p>
            Vendredi : 16h30 – 18h30<br />
            Samedi : 09h00 – 12h00
          </p>
        </div>

        <div className="footer-col">
          <h4>Navigation</h4>
          <ul>
            <li><Link href="/producers" locale={locale}>Producteurs</Link></li>
            <li><Link href="/membership" locale={locale}>Adhésion</Link></li>
            <li><Link href="/contact" locale={locale}>Contact</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Association Le P’tit Mag – Sans but lucratif</p>
      </div>
    </footer>
  );
}
