import { Link } from '@/i18n/navigation';
import styles from './Hero.module.css';

// Emojis associés aux 4 étapes du parcours adhérent
const STEP_EMOJIS = ['🔍', '📋', '🛒', '📦'];

type HeroProps = {
  locale: 'fr' | 'en';
  t: (key: string) => string;
};

export function Hero({ locale, t }: HeroProps) {
  const infos = t('home.block3_text').split(' | ');

  // Découpe la chaîne de traduction "1)Step one, 2) Step two..." en tableau propre
  const steps = t('home.how_steps')
    .split(/\d+\)\s*/)
    .filter(Boolean)
    .map(s => s.replace(/^[,.\s]+|[,.\s]+$/g, '').trim());

  return (
    <section className={`container ${styles.hero}`}>

      {/* ── Bloc titre + CTA ── */}
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

      {/* ── Cartes de contenu ── */}
      <div className={styles.grid}>
        {/* Carte image */}
        <article className={`${styles.card} ${styles.cardImage}`}>
          <div className={styles.cardImageBg} aria-hidden="true" />
          <div className={styles.cardOverlay}>
            <h2 className={styles.cardTitleOnImage}>{t('home.block1_title')}</h2>
            <p className={styles.cardTextOnImage}>{t('home.block1_text')}</p>
          </div>
        </article>

        {/* Carte orange highlight */}
        <article className={`${styles.card} ${styles.cardHighlight}`}>
          <p className={styles.cardTextLight}>{t('home.block2_text')}</p>
        </article>

        {/* Carte infos pratiques */}
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

      {/* ── Comment ça marche — 4 étapes ── */}
      <section className={styles.how}>
        <h2 className={styles.howTitle}>{t('home.how_title')}</h2>

        <div className={styles.stepsGrid}>
          {steps.map((step, i) => (
            <div key={i} className={styles.stepCard}>
              <div className={styles.stepNumber}>{i + 1}</div>
              <div className={styles.stepEmoji}>{STEP_EMOJIS[i] ?? '→'}</div>
              <p className={styles.stepText}>{step}</p>
            </div>
          ))}
        </div>
      </section>

    </section>
  );
}
