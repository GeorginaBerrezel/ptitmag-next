import { site } from '@/lib/site'

const DAY_LABELS_FR: Record<string, string> = {
  Monday: 'Lundi',
  Tuesday: 'Mardi',
  Wednesday: 'Mercredi',
  Thursday: 'Jeudi',
  Friday: 'Vendredi',
  Saturday: 'Samedi',
  Sunday: 'Dimanche',
}

function formatTimeRange(range: string): string {
  const [open, close] = range.split('-')
  const fmt = (t: string) => t.replace(':', 'h')
  return `${fmt(open)} – ${fmt(close)}`
}

/** Horaires d'ouverture du magasin, une ligne par jour (texte ou HTML). */
export function formatOpeningHoursLines(locale = 'fr'): string[] {
  return site.openingHours.flatMap(slot => {
    const dayLabel = locale === 'fr'
      ? slot.days.map(d => DAY_LABELS_FR[d] ?? d).join(' & ')
      : slot.days.join(' & ')
    const times = slot.ranges.map(formatTimeRange).join(' & ')
    return [`${dayLabel} : ${times}`]
  })
}

export function formatOpeningHoursText(locale = 'fr'): string {
  return formatOpeningHoursLines(locale).join(', ')
}

export function formatOpeningHoursHtml(locale = 'fr'): string {
  return formatOpeningHoursLines(locale).join('<br/>')
}
