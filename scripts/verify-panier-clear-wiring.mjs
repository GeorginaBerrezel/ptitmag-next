/**
 * Vérifie que la page panier branche bien ConfirmDialog
 * (pas de clearCart direct sur le bouton « Vider le panier »).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const panier = readFileSync(
  join(root, 'app/[locale]/(members)/panier/page.tsx'),
  'utf8',
)

assert.match(panier, /from '@\/components\/ui\/ConfirmDialog'/)
assert.match(panier, /clearConfirmOpen/)
assert.match(panier, /aria-haspopup="dialog"/)
assert.match(
  panier,
  /onClick=\{\(\) => setClearConfirmOpen\(true\)\}/,
  'le bouton doit ouvrir le dialog, pas vider tout de suite',
)
assert.match(
  panier,
  /Cette action retire tous les articles du panier/,
)
assert.match(
  panier,
  /onConfirm=\{\(\) => \{\s*setClearConfirmOpen\(false\)\s*clearCart\(\)/,
)

// Le clear après commande réussie reste direct (voulu)
const successClear = panier.indexOf('clearCart()')
const dialogConfirm = panier.indexOf('onConfirm=')
assert.ok(successClear >= 0)
assert.ok(dialogConfirm >= 0)

console.log('OK — branchement panier / ConfirmDialog conforme au plan')
