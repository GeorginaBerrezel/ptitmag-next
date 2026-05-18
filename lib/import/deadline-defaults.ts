/**
 * Dates limite suggérées pour l'admin (règle Joel) :
 * - Mercredi 18h30 — pains / pâtisseries (Graines d'Avenir) + truffes
 * - Jeudi 12h00 — autres fournisseurs locaux + Biopartner
 *
 * Calculées dans le fuseau horaire du navigateur / serveur au moment de l'appel.
 */

function nextWeekdayAt(ref: Date, targetDow: number, hour: number, minute: number): Date {
  const out = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), hour, minute, 0, 0)
  const dow = ref.getDay()
  const add = (targetDow - dow + 7) % 7
  out.setDate(out.getDate() + add)
  if (out.getTime() <= ref.getTime()) {
    out.setDate(out.getDate() + 7)
  }
  return out
}

/** Prochain mercredi à 18h30 (si déjà passé cette semaine → semaine suivante). */
export function nextWednesday1830(ref = new Date()): Date {
  return nextWeekdayAt(ref, 3, 18, 30)
}

/** Prochain jeudi à 12h00 (si déjà passé cette semaine → semaine suivante). */
export function nextThursday1200(ref = new Date()): Date {
  return nextWeekdayAt(ref, 4, 12, 0)
}

/** Valeur pour input type="datetime-local" (heure locale). */
export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
