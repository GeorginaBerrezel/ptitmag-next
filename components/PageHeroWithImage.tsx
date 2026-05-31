import styles from './PageHeroWithImage.module.css'

type Props = {
  imageSrc: string
  imagePosition?: string
  /** 'cover' par défaut ; 'width' = pleine largeur sans bandes latérales */
  imageZoom?: 'cover' | 'width'
  kicker: string
  title: string
  intro?: string
  className?: string
  marginBottom?: string
}

export default function PageHeroWithImage({
  imageSrc,
  imagePosition = 'center',
  imageZoom = 'cover',
  kicker,
  title,
  intro,
  className,
  marginBottom = '2rem',
}: Props) {
  return (
    <div
      className={`page-hero ${styles.hero}${imageZoom === 'width' ? ` ${styles.heroFitWidth}` : ''}${className ? ` ${className}` : ''}`}
      style={{
        backgroundImage: `url(${imageSrc})`,
        backgroundPosition: imagePosition,
        marginBottom,
      }}
    >
      <div className={styles.content}>
        <p className={`page-hero-kicker ${styles.kicker}`}>{kicker}</p>
        <h1 className={styles.title}>{title}</h1>
        {intro && <p className={styles.intro}>{intro}</p>}
      </div>
    </div>
  )
}
