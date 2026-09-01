import { Link } from '@/i18n/navigation';
import { ClipboardList, Package, Search, ShoppingCart } from 'lucide-react';
import { SHOP_IMAGES } from '@/lib/site-images';
import styles from './Hero.module.css';
import type { StepDetail, TrialContent } from '@/app/[locale]/page';

const STEP_ICONS = [Search, ClipboardList, ShoppingCart, Package] as const;

type HeroProps = {
  locale: 'fr' | 'en';
  t: (key: string) => string;
  stepsDetail: StepDetail[];
  trialContent: TrialContent;
};

export function Hero({ locale, t, stepsDetail, trialContent }: HeroProps) {
  const infos = t('home.block3_text').split(' | ');

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
          <p className={styles.subtitleHint}>{t('home.subtitle_hint')}</p>
          <p className={styles.objective}>{t('home.objective')}</p>
        </div>
      </div>

      {/* ── Cartes de contenu ── */}
      <div className={styles.grid}>
        {/* Carte image */}
        <article className={`${styles.card} ${styles.cardImage}`}>
          <div
            className={styles.cardImageBg}
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.75)), url(${SHOP_IMAGES.home})`,
              backgroundPosition: 'center 45%',
            }}
            aria-hidden="true"
          />
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
          {stepsDetail.map((step, i) => {
            const StepIcon = STEP_ICONS[i]
            return (
            <div key={i} className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <div className={styles.stepNumber}>{i + 1}</div>
                {StepIcon ? (
                  <StepIcon className={styles.stepEmoji} size={20} strokeWidth={2} aria-hidden="true" />
                ) : null}
              </div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
            </div>
            )
          })}
        </div>

        {/* ── Bannière CTA essai gratuit ── */}
        <div className={styles.trialBanner}>
          <div className={styles.trialContent}>
            <p className={styles.trialTitle}>{trialContent.title}</p>
            <p className={styles.trialText}>{trialContent.text}</p>
            <p className={styles.trialNote}>{trialContent.note}</p>
          </div>
          <Link
            href="/inscription"
            locale={locale}
            className={styles.trialBtn}
          >
            {trialContent.cta}
          </Link>
        </div>
      </section>

    </section>
  );
}
