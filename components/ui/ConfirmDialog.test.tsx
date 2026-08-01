/**
 * Vérifie ConfirmDialog sans catalogue / auth / navigateur manuel.
 * Lancer : npm run test:confirm-dialog
 */
import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { createRef, useState, type ReactElement } from 'react'
import { Window } from 'happy-dom'
import { ConfirmDialog } from './ConfirmDialog'

const window = new Window({ url: 'https://localhost/' })
const { document } = window

Object.defineProperty(globalThis, 'window', { value: window, configurable: true })
Object.defineProperty(globalThis, 'document', { value: document, configurable: true })
Object.defineProperty(globalThis, 'HTMLElement', { value: window.HTMLElement, configurable: true })
Object.defineProperty(globalThis, 'Node', { value: window.Node, configurable: true })
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true })
Object.defineProperty(globalThis, 'MutationObserver', {
  value: window.MutationObserver,
  configurable: true,
})
Object.defineProperty(globalThis, 'requestAnimationFrame', {
  value: (cb: FrameRequestCallback) => window.setTimeout(() => cb(Date.now()), 0),
  configurable: true,
})
Object.defineProperty(globalThis, 'cancelAnimationFrame', {
  value: (id: number) => window.clearTimeout(id),
  configurable: true,
})
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
  value: true,
  configurable: true,
})

let root: Root | null = null
let container: HTMLElement | null = null

async function render(ui: ReactElement) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(ui)
  })
  // laisser useEffect (focus) s'exécuter
  await act(async () => {
    await new Promise(r => setTimeout(r, 0))
  })
}

async function cleanup() {
  if (root) {
    await act(async () => {
      root!.unmount()
    })
  }
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
}

afterEach(async () => {
  await cleanup()
})

function Harness({
  onConfirm,
}: {
  onConfirm: () => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = createRef<HTMLButtonElement>()
  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Vider le panier
      </button>
      <ConfirmDialog
        open={open}
        title="Vider le panier ?"
        description="Cette action retire tous les articles du panier. Elle ne peut pas être annulée."
        confirmLabel="Vider le panier"
        confirmTone="danger"
        returnFocusRef={triggerRef}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false)
          onConfirm()
        }}
      />
    </div>
  )
}

describe('ConfirmDialog — vider le panier', () => {
  it('n’affiche pas le dialog tant qu’on n’a pas cliqué', async () => {
    await render(<Harness onConfirm={() => {}} />)
    assert.equal(document.querySelector('[role="dialog"]'), null)
  })

  it('ouvre un dialog accessible au clic', async () => {
    await render(<Harness onConfirm={() => {}} />)
    const trigger = document.querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement
    await act(async () => {
      trigger.click()
    })
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })

    const dialog = document.querySelector('[role="dialog"]')
    assert.ok(dialog, 'dialog présent')
    assert.equal(dialog?.getAttribute('aria-modal'), 'true')
    assert.match(dialog?.textContent ?? '', /ne peut pas être annulée/)
    assert.equal(document.activeElement?.textContent?.trim(), 'Annuler')
  })

  it('Annuler ferme sans appeler onConfirm', async () => {
    let confirmed = false
    await render(<Harness onConfirm={() => { confirmed = true }} />)
    const trigger = document.querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement
    await act(async () => {
      trigger.click()
    })
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })

    const cancel = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Annuler')
    assert.ok(cancel)
    await act(async () => {
      cancel!.click()
    })
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })

    assert.equal(confirmed, false)
    assert.equal(document.querySelector('[role="dialog"]'), null)
    assert.equal(document.activeElement, trigger)
  })

  it('Escape ferme sans confirmer', async () => {
    let confirmed = false
    await render(<Harness onConfirm={() => { confirmed = true }} />)
    const trigger = document.querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement
    await act(async () => {
      trigger.click()
    })
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })

    await act(async () => {
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })

    assert.equal(confirmed, false)
    assert.equal(document.querySelector('[role="dialog"]'), null)
  })

  it('confirmer appelle onConfirm et ferme le dialog', async () => {
    let confirmed = false
    await render(<Harness onConfirm={() => { confirmed = true }} />)
    const trigger = document.querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement
    await act(async () => {
      trigger.click()
    })
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })

    const confirmBtn = [...document.querySelectorAll('button')].find(
      b => b.textContent?.trim() === 'Vider le panier' && b !== trigger,
    )
    assert.ok(confirmBtn, 'bouton danger présent')
    await act(async () => {
      confirmBtn!.click()
    })
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })

    assert.equal(confirmed, true)
    assert.equal(document.querySelector('[role="dialog"]'), null)
  })
})
