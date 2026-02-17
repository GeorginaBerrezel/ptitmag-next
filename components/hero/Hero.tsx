import { Link } from '@/i18n/navigation';
import styles from './Hero.module.css';

type HeroProps = {
  locale: 'fr' | 'en';
  t: (key: string) => string;
};

export function Hero({ locale, t }: HeroProps) {
  const infos = t('home.block3_text').split(' | ');

  return (
    <section className={`container ${styles.hero}`}>
      <div className={styles.top}>
        <div className={styles.left}>
          <h1 className={styles.title}>{t('home.title')}</h1>

          <div className={styles.actions}>
            <Link href="/membership" locale={locale} className="btn">
              {t('nav.membership')}
            </Link>
            <Link href="/contact" locale={locale} className="btn btn-outline">
              {t('nav.contact')}
            </Link>
          </div>
        </div>

        <div className={styles.right}>
          <p className={styles.subtitle}>{t('home.subtitle')}</p>
          <p className={styles.objective}>{t('home.objective')}</p>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={`${styles.card} ${styles.cardImage}`}>
          <div className={styles.cardImageBg} aria-hidden="true" />
          <div className={styles.cardOverlay}>
            <h2 className={styles.cardTitleOnImage}>{t('home.block1_title')}</h2>
            <p className={styles.cardTextOnImage}>{t('home.block1_text')}</p>
          </div>
        </article>

        <article className={`${styles.card} ${styles.cardHighlight}`}>
          <p className={styles.cardTextLight}>{t('home.block2_text')}</p>
        </article>

        <article className={styles.card}>
          <h2 className={styles.cardTitle}>{t('home.block3_title')}</h2>
          <ul className={styles.infoList}>
            {infos.map((line) => (
              <li key={line} className={styles.infoItem}>
                {line}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <section className={styles.how}>
        <h2 className={styles.howTitle}>{t('home.how_title')}</h2>
        <p className={styles.howText}>{t('home.how_steps')}</p>
      </section>
    </section>
  );
}
