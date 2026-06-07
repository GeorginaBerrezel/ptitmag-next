'use client'

import { use, useRef, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { nextWednesday1830, nextThursday1200, toDatetimeLocalValue } from '@/lib/import/deadline-defaults'
import { BIOPARTNER_CATALOGS } from '@/lib/import/biopartner-catalogs'
import { InlineStatus } from '@/components/ui/InlineStatus'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb'

type ImportResult = {
  success: boolean
  message: string
  stats: {
    productsCreated: number
    productsUpdated: number
    errors: number
    sheetResults?: Record<string, { count: number; supplierName: string }>
    /** upsert = mise à jour sans effacer ; replace = ancienne stratégie (effacement) */
    importStrategy?: 'upsert' | 'replace'
  }
  errors: string[]
}

type SupplierOption = {
  key: string
  label: string
  type: 'local' | 'grossiste_bio'
  endpoint: string
  fileHint: string
  fileInstructions: React.ReactNode
  acceptsXlsx?: boolean
  /** Biopartner : .xlsx recommandé + .csv secours */
  acceptsCsv?: boolean
  // 'mercredi' = délai mercredi (Graines d'Avenir, Truffes)
  // 'jeudi'    = délai jeudi (tous les autres locaux + Biopartner)
  // undefined  = pas de groupe fixe (grossistes sans contrainte hebdo)
  deadlineGroup?: 'mercredi' | 'jeudi'
}

type SupplierGroup = {
  label: string
  suppliers: SupplierOption[]
}

const SUPPLIER_GROUPS: SupplierGroup[] = [
  {
    label: 'Feuille hebdomadaire complète',
    suppliers: [
      {
        key: 'feuille_hebdo',
        label: 'Tous les locaux (1 fichier)',
        type: 'local',
        endpoint: '/api/admin/import-hebdo',
        fileHint: 'Feuille hebdomadaire (.xlsx uniquement — plusieurs onglets)',
        acceptsXlsx: true,
        fileInstructions: (
          <>
            <strong>Un seul fichier Excel (.xlsx)</strong> pour importer tous les producteurs locaux de la semaine
            (plusieurs onglets — le .csv ne convient pas ici).<br />
            Onglets importés : <strong>Bioterroir, Fermette à Didi, Graines d&apos;Avenir, Brasseries d&apos;Ayent, Vins bio et nature, Truffes</strong>.<br />
            <span style={{ opacity: 0.75 }}>Le catalogue n&apos;est plus effacé — produits absents du fichier : masquer dans Fournisseurs.</span><br />
            <span style={{ opacity: 0.75 }}>L&apos;onglet Biopartner est ignoré (import séparé en .xlsx — section Biopartner).</span>
          </>
        ),
      },
    ],
  },
  {
    label: 'Fournisseurs locaux — fichier par fichier',
    suppliers: [
      {
        key: 'bioterroir',
        label: 'Bioterroir',
        type: 'local',
        endpoint: '/api/admin/import-local-supplier',
        fileHint: 'Bioterroir (.xlsx ou .csv)',
        acceptsXlsx: true,
        acceptsCsv: true,
        deadlineGroup: 'jeudi',
        fileInstructions: <>Légumes &amp; fruits — format Joel (Produit/Prix) ou gabarit simple. Voir Guide colonnes.</>,
      },
      {
        key: 'fermette_didi',
        label: 'Fermette à Didi',
        type: 'local',
        endpoint: '/api/admin/import-local-supplier',
        fileHint: 'Fermette à Didi (.xlsx ou .csv)',
        acceptsXlsx: true,
        acceptsCsv: true,
        deadlineGroup: 'jeudi',
        fileInstructions: <>Produits fermiers (œufs, fromages, charcuterie). Prix TTC.</>,
      },
      {
        key: 'graines_avenir',
        label: "Graines d'Avenir",
        type: 'local',
        endpoint: '/api/admin/import-local-supplier',
        fileHint: "Graines d'avenir (.xlsx ou .csv)",
        acceptsXlsx: true,
        acceptsCsv: true,
        deadlineGroup: 'mercredi',
        fileInstructions: <>Pains & pâtisseries. <strong style={{ color: '#b45309' }}>Délai mercredi 18h30</strong> — commander avant les autres.</>,
      },
      {
        key: 'brasseries_ayent',
        label: "Brasseries d'Ayent",
        type: 'local',
        endpoint: '/api/admin/import-local-supplier',
        fileHint: "Brasseries d'Ayent (.xlsx ou .csv)",
        acceptsXlsx: true,
        acceptsCsv: true,
        deadlineGroup: 'jeudi',
        fileInstructions: <>Bières artisanales valaisannes. Prix TTC.</>,
      },
      {
        key: 'vins_bio',
        label: 'Vins bio et nature',
        type: 'local',
        endpoint: '/api/admin/import-local-supplier',
        fileHint: 'Vins bio et nature (.xlsx ou .csv)',
        acceptsXlsx: true,
        acceptsCsv: true,
        deadlineGroup: 'jeudi',
        fileInstructions: <>Vins bio valaisans (Chèrouche, Olivier & Stéphanie). Prix TTC.</>,
      },
      {
        key: 'truffes',
        label: 'Truffes',
        type: 'local',
        endpoint: '/api/admin/import-local-supplier',
        fileHint: 'Truffes (.xlsx ou .csv)',
        acceptsXlsx: true,
        acceptsCsv: true,
        deadlineGroup: 'mercredi',
        fileInstructions: <>Truffes au chocolat cru. <strong style={{ color: '#b45309' }}>Délai mercredi 18h30</strong> — commander avant les autres.</>,
      },
    ],
  },
  {
    label: 'Biopartner — 4 catalogues',
    suppliers: BIOPARTNER_CATALOGS.map(c => ({
      key: c.importKey,
      label: c.shortLabel,
      type: 'grossiste_bio' as const,
      endpoint: '/api/admin/import-biopartner',
      acceptsXlsx: true,
      acceptsCsv: true,
      fileHint: `Biopartner ${c.shortLabel} (.xlsx ou .csv)`,
      fileInstructions: (
        <>
          <strong>{c.name}</strong> — {c.description}<br />
          <strong>Format complexe Biopartner</strong> — voir <strong>Guide colonnes</strong> (type complexe).<br />
          Déposer le fichier <strong>.xlsx</strong> ou <strong>.csv</strong> tel quel (liste personnelle filtrée).<br />
          Colonne <strong>TVA</strong> (col.&nbsp;Z) : 2,6&nbsp;% ou 8,1&nbsp;% sur les prix HT. <strong>PDF</strong> non importable.
        </>
      ),
    })),
  },
  {
    label: 'Grossistes bio (autres)',
    suppliers: [
      {
        key: 'cave_levain',
        label: 'Cave à levain',
        type: 'local',
        endpoint: '/api/admin/import-supplier',
        acceptsXlsx: true,
        acceptsCsv: true,
        fileHint: 'Cave à levain (.xlsx ou .csv)',
        fileInstructions: (
          <>
            Importer le <strong>formulaire de commande</strong> reçu de la Cave à levain.<br />
            Les sections (Boulangerie, Viennoiserie, Traiteur, Pâtisserie) deviennent les catégories.
            Prix TTC (2.6% inclus).
          </>
        ),
      },
      {
        key: 'dailles',
        label: 'Domaine des Dailles',
        type: 'local',
        endpoint: '/api/admin/import-supplier',
        acceptsXlsx: true,
        acceptsCsv: true,
        fileHint: 'Dailles (.xlsx ou .csv)',
        fileInstructions: (
          <>
            Importer le <strong>fichier de prix</strong> des Dailles.<br />
            Chaque produit est importé en plusieurs variantes selon le conditionnement (1 kg, 5 kg, 25 kg…).
            Prix TTC (2.6% inclus).
          </>
        ),
      },
      {
        key: 'novoma',
        label: 'Novoma',
        type: 'grossiste_bio',
        endpoint: '/api/admin/import-supplier',
        acceptsXlsx: true,
        acceptsCsv: true,
        fileHint: 'Novoma (.xlsx ou .csv)',
        fileInstructions: (
          <>
            Importer le <strong>bon de commande Novoma</strong>.<br />
            Le prix importé est le tarif à l&apos;unité (colonne «&nbsp;1&nbsp;»). Compléments alimentaires.
          </>
        ),
      },
      {
        key: 'naturmel',
        label: "NaturMel (M'Cosmetics)",
        type: 'grossiste_bio',
        endpoint: '/api/admin/import-supplier',
        acceptsXlsx: true,
        acceptsCsv: true,
        fileHint: 'NaturMel (.xlsx ou .csv)',
        fileInstructions: (
          <>
            Importer le <strong>formulaire NaturMel</strong>.<br />
            Le prix importé est le tarif revendeur (&lt;&nbsp;5 pièces). Cosmétiques bio.
          </>
        ),
      },
    ],
  },
  {
    label: 'Nouveaux grossistes (format simple — point-virgule)',
    suppliers: [
      {
        key: 'saldac',
        label: 'Saldac',
        type: 'grossiste_bio',
        endpoint: '/api/admin/import-supplier',
        acceptsXlsx: true,
        acceptsCsv: true,
        fileHint: 'Saldac (.xlsx ou .csv)',
        fileInstructions: (
          <>
            <strong>Format simple</strong> — voir Guide colonnes. Colonnes : <strong>nom</strong>, <strong>prix</strong>
            (optionnel : ref, categorie, unite). UTF-8, séparateur <strong>;</strong>.
          </>
        ),
      },
      {
        key: 'gebana',
        label: 'Gebana',
        type: 'grossiste_bio',
        endpoint: '/api/admin/import-supplier',
        acceptsXlsx: true,
        acceptsCsv: true,
        fileHint: 'Gebana (.xlsx ou .csv)',
        fileInstructions: <>Même gabarit simple que Saldac (nom + prix minimum).</>,
      },
      {
        key: 'dr_jacobs',
        label: "Dr Jacob's",
        type: 'grossiste_bio',
        endpoint: '/api/admin/import-supplier',
        acceptsXlsx: true,
        acceptsCsv: true,
        fileHint: "Dr Jacob's (.xlsx ou .csv)",
        fileInstructions: <>Gabarit simple : nom + prix (compléments alimentaires).</>,
      },
      {
        key: 'kumbha',
        label: 'Kumbha Sàrl',
        type: 'grossiste_bio',
        endpoint: '/api/admin/import-supplier',
        acceptsXlsx: true,
        acceptsCsv: true,
        fileHint: 'Kumbha (.xlsx ou .csv)',
        fileInstructions: <>Gabarit simple : nom + prix.</>,
      },
    ],
  },
]

// Liste plate pour la recherche par clé
const SUPPLIERS: SupplierOption[] = SUPPLIER_GROUPS.flatMap(g => g.suppliers)

/** Prochains créneaux mercredi 18h30 / jeudi 12h00 — Joel peut modifier dans les champs. */
function deadlineDefaultsForSelection(key: string): {
  dateLimite: string
  dateLimiteMercredi: string
  dateLimiteJeudi: string
} {
  const mer = toDatetimeLocalValue(nextWednesday1830())
  const jeu = toDatetimeLocalValue(nextThursday1200())
  if (key === 'feuille_hebdo') {
    return { dateLimite: '', dateLimiteMercredi: mer, dateLimiteJeudi: jeu }
  }
  const s = SUPPLIERS.find(x => x.key === key)
  if (!s) return { dateLimite: '', dateLimiteMercredi: '', dateLimiteJeudi: '' }
  if (s.deadlineGroup === 'mercredi') {
    return { dateLimite: mer, dateLimiteMercredi: '', dateLimiteJeudi: '' }
  }
  if (s.deadlineGroup === 'jeudi') {
    return { dateLimite: jeu, dateLimiteMercredi: '', dateLimiteJeudi: '' }
  }
  return { dateLimite: '', dateLimiteMercredi: '', dateLimiteJeudi: '' }
}

const TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  local: { label: 'Local', bg: '#e8f5e9', color: '#2e7d32' },
  grossiste_bio: { label: 'Grossiste bio', bg: '#e3f2fd', color: '#1565c0' },
}

export default function ImportPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)

  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedKey, setSelectedKey] = useState<string>('feuille_hebdo')
  const [file, setFile] = useState<File | null>(null)
  const initDeadlines = deadlineDefaultsForSelection('feuille_hebdo')
  const [dateLimite, setDateLimite] = useState(initDeadlines.dateLimite)
  const [dateLimiteMercredi, setDateLimiteMercredi] = useState(initDeadlines.dateLimiteMercredi)
  const [dateLimiteJeudi, setDateLimiteJeudi] = useState(initDeadlines.dateLimiteJeudi)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supplier = SUPPLIERS.find(s => s.key === selectedKey)!
  const isHebdo = selectedKey === 'feuille_hebdo'
  const isBiopartnerImport = supplier?.endpoint === '/api/admin/import-biopartner'

  function handleSupplierChange(key: string) {
    setSelectedKey(key)
    setFile(null)
    setResult(null)
    setError(null)
    const d = deadlineDefaultsForSelection(key)
    setDateLimite(d.dateLimite)
    setDateLimiteMercredi(d.dateLimiteMercredi)
    setDateLimiteJeudi(d.dateLimiteJeudi)
    if (fileRef.current) fileRef.current.value = ''
  }

  function resetDeadlineFields() {
    const d = deadlineDefaultsForSelection(selectedKey)
    setDateLimite(d.dateLimite)
    setDateLimiteMercredi(d.dateLimiteMercredi)
    setDateLimiteJeudi(d.dateLimiteJeudi)
  }

  async function handleImport() {
    if (!file || !supplier) return
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    if (isHebdo) {
      // Feuille hebdo : deux délais distincts selon le fournisseur
      if (dateLimiteMercredi) formData.append('date_limite_mercredi', dateLimiteMercredi)
      if (dateLimiteJeudi) formData.append('date_limite_jeudi', dateLimiteJeudi)
    } else {
      if (dateLimite) formData.append('date_limite_commande', dateLimite)
    }

    // Pour les routes qui ont besoin de la clé fournisseur
    const needsSupplierKey = supplier.endpoint === '/api/admin/import-supplier'
      || supplier.endpoint === '/api/admin/import-local-supplier'
    if (needsSupplierKey) {
      formData.append('supplier', supplier.key)
    }

    if (isBiopartnerImport) {
      formData.append('catalog', supplier.key)
    }

    const res = await fetch(supplier.endpoint, { method: 'POST', body: formData })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Une erreur est survenue.')
      return
    }

    setResult(data)
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const badge = TYPE_BADGE[supplier.type]

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem', maxWidth: 660 }}>

      <AdminBreadcrumb items={[{ label: 'Admin', href: '/admin' }, { label: 'Import catalogue' }]} />

      <h1 style={{ marginBottom: '0.25rem' }}>Import catalogue</h1>
      <p className="admin-lead" style={{ marginBottom: '0.75rem' }}>
        Sélectionnez le fournisseur et importez leur fichier pour mettre à jour le catalogue.
      </p>
      <p style={{ margin: '0 0 2rem', fontSize: '0.88rem' }}>
        <Link href="/admin/guide-import" locale={locale} style={{ color: '#1565c0', fontWeight: 600 }}>
          Guide colonnes &amp; formats →
        </Link>
        {' '}— comment le site lit chaque fichier (Biopartner, locaux, CSV).
      </p>

      {/* Sélecteur fournisseur — groupes */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {SUPPLIER_GROUPS.map(group => (
          <div key={group.label}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.4 }}>
              {group.label}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.4rem' }}>
              {group.suppliers.map(s => {
                const b = TYPE_BADGE[s.type]
                const active = s.key === selectedKey
                const dlBadge = s.deadlineGroup === 'mercredi'
                  ? { label: '⏰ Mercredi', color: '#b45309', bg: '#fef3c7' }
                  : s.deadlineGroup === 'jeudi'
                  ? { label: '⏰ Jeudi', color: '#1565c0', bg: '#e3f2fd' }
                  : null
                return (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleSupplierChange(s.key)}
                    style={{
                      padding: '0.55rem 0.5rem',
                      border: `2px solid ${active ? '#1a1a2e' : 'rgba(16,24,40,0.12)'}`,
                      borderRadius: 10,
                      background: active ? '#1a1a2e' : '#fff',
                      color: active ? '#fff' : '#1a1a2e',
                      fontWeight: active ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      lineHeight: 1.3,
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999,
                        background: active ? 'rgba(255,255,255,0.15)' : b.bg,
                        color: active ? '#fff' : b.color,
                      }}>
                        {b.label}
                      </span>
                      {dlBadge && (
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999,
                          background: active ? 'rgba(255,255,255,0.12)' : dlBadge.bg,
                          color: active ? 'rgba(255,255,255,0.85)' : dlBadge.color,
                        }}>
                          {dlBadge.label}
                        </span>
                      )}
                    </div>
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Instructions spécifiques */}
      <div style={{
        background: '#f0f9f4', borderRadius: 12, padding: '1rem 1.25rem',
        marginBottom: '1.75rem', border: '1px solid #c3e6cb',
        fontSize: '0.85rem', color: '#2d6a4f', lineHeight: 1.7,
      }}>
        <p style={{ margin: '0 0 0.4rem', fontWeight: 700, fontSize: '0.88rem', color: '#1e5c35' }}>
          Comment procéder
        </p>
        {supplier.fileInstructions}
      </div>

      {/* Dates limites — pas pour Biopartner (délai géré dans Fournisseurs, Phase 2) */}
      {!isBiopartnerImport && (
      <div style={{ marginBottom: '1.25rem' }}>
        {(isHebdo || supplier.deadlineGroup) && (
          <p style={{ margin: '0 0 0.65rem', fontSize: '0.78rem', opacity: 0.62, lineHeight: 1.5 }}>
            Les dates sont <strong>pré-remplies</strong> selon la règle habituelle (mercredi 18h30 / jeudi 12h00 — prochain créneau à venir).
            Joel peut les modifier à tout moment.
            {' '}
            <button
              type="button"
              onClick={resetDeadlineFields}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: '#1565c0', fontWeight: 600, cursor: 'pointer',
                textDecoration: 'underline', fontSize: 'inherit', fontFamily: 'inherit',
              }}
            >
              Réinitialiser aux valeurs suggérées
            </button>
          </p>
        )}
      {isHebdo ? (
        /* Feuille hebdo : deux délais distincts */
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            background: '#fff8e6', border: '1px solid #ffe082',
            borderRadius: 10, padding: '0.75rem 1rem',
            fontSize: '0.82rem', color: '#7a5500', lineHeight: 1.6,
          }}>
            <strong>Deux délais différents</strong> selon le fournisseur :<br />
            <span style={{ opacity: 0.8 }}>• Mercredi → Graines d&apos;Avenir + Truffes</span><br />
            <span style={{ opacity: 0.8 }}>• Jeudi → Bioterroir, Fermette à Didi, Brasseries d&apos;Ayent, Vins</span>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
              Délai mercredi <span style={{ opacity: 0.55, fontWeight: 400 }}>(Graines d&apos;Avenir + Truffes)</span>
            </label>
            <input
              type="datetime-local"
              value={dateLimiteMercredi}
              onChange={e => setDateLimiteMercredi(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem 0.9rem',
                border: '1.5px solid rgba(16,24,40,0.15)', borderRadius: 8,
                fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.73rem', opacity: 0.45 }}>
              Ex : mercredi 20 mai 18h30 → <code>2026-05-20T18:30</code>
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
              Délai jeudi <span style={{ opacity: 0.55, fontWeight: 400 }}>(tous les autres fournisseurs)</span>
            </label>
            <input
              type="datetime-local"
              value={dateLimiteJeudi}
              onChange={e => setDateLimiteJeudi(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem 0.9rem',
                border: '1.5px solid rgba(16,24,40,0.15)', borderRadius: 8,
                fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.73rem', opacity: 0.45 }}>
              Ex : jeudi 21 mai 12h00 → <code>2026-05-21T12:00</code>
            </p>
          </div>
        </div>
      ) : (
        /* Fournisseur unique : un seul délai */
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Date limite de commande
          </label>
          <input
            type="datetime-local"
            value={dateLimite}
            onChange={e => setDateLimite(e.target.value)}
            style={{
              width: '100%', padding: '0.65rem 0.9rem',
              border: '1.5px solid rgba(16,24,40,0.15)', borderRadius: 8,
              fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', opacity: 0.5 }}>
            Exemple : jeudi 21 mai 12h00 → <code>2026-05-21T12:00</code>
          </p>
        </div>
      )}
      </div>
      )}

      {isBiopartnerImport && (
        <div style={{
          background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10,
          padding: '0.75rem 1rem', marginBottom: '1.25rem',
          fontSize: '0.82rem', color: '#4338ca', lineHeight: 1.55,
        }}>
          Le délai de commande se règle dans <strong>Admin → Fournisseurs</strong> (toggle « Commandes ouvertes »), pas ici.
        </div>
      )}

      {/* Zone de dépôt */}
      <label
        htmlFor="import-file-input"
        style={{
          display: 'block',
          border: `2px dashed ${file ? '#2e7d32' : 'rgba(16,24,40,0.2)'}`,
          borderRadius: 12,
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: file ? '#f1f8f1' : '#fafafa',
          transition: 'all 0.2s',
          marginBottom: '1.25rem',
        }}
      >
        <p style={{ margin: '0 0 0.35rem', fontSize: '1.4rem' }} aria-hidden="true">{file ? '✓' : '📄'}</p>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem' }}>
          {file ? file.name : `Choisir le fichier ${supplier.fileHint}`}
        </p>
        {file ? (
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'rgba(16,24,40,0.62)' }}>
            {(file.size / 1024).toFixed(1)} Ko · Cliquer pour changer
          </p>
        ) : (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'rgba(16,24,40,0.58)' }}>
            Format{' '}
            {supplier.acceptsXlsx && supplier.acceptsCsv
              ? 'Excel (.xlsx) ou CSV'
              : supplier.acceptsXlsx
                ? 'Excel (.xlsx)'
                : 'CSV'}
          </p>
        )}
        <input
          id="import-file-input"
          ref={fileRef}
          type="file"
          accept={
            supplier.acceptsXlsx && supplier.acceptsCsv
              ? '.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv'
              : supplier.acceptsXlsx
                ? '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : '.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv'
          }
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
          onChange={e => {
            setFile(e.target.files?.[0] ?? null)
            setResult(null)
            setError(null)
          }}
        />
      </label>

      {/* Bouton */}
      <button
        onClick={handleImport}
        disabled={!file || loading}
        aria-busy={loading}
        style={{
          width: '100%',
          padding: '0.8rem',
          background: !file || loading ? '#ccc' : '#1a1a2e',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: '1rem',
          cursor: !file || loading ? 'not-allowed' : 'pointer',
          marginBottom: '1.5rem',
          letterSpacing: '0.01em',
        }}
      >
        {loading ? 'Import en cours…' : `Importer ${supplier.label}`}
      </button>

      {loading && (
        <InlineStatus
          message="Import du catalogue en cours — cela peut prendre quelques secondes…"
          centered
          live="assertive"
        />
      )}

      {/* Erreur */}
      {error && (
        <div style={{
          background: '#fdf2f2', border: '1px solid #f5c6c6',
          borderRadius: 10, padding: '1rem 1.25rem', color: '#c0392b', fontSize: '0.88rem',
        }}>
          {error}
        </div>
      )}

      {/* Résultat */}
      {result && (
        <div style={{
          background: result.stats.errors === 0 ? '#f1f8f1' : '#fffbf0',
          border: `1px solid ${result.stats.errors === 0 ? '#a5d6a7' : '#ffe082'}`,
          borderRadius: 12, padding: '1.25rem 1.5rem',
        }}>
          <p style={{ margin: '0 0 1rem', fontWeight: 700, fontSize: '0.95rem' }}>
            {result.stats.errors === 0 ? '✓ ' : '⚠ '}{result.message}
          </p>
          {result.stats.importStrategy === 'upsert' ? (
            <div style={{
              background: '#fff', borderRadius: 8, padding: '1rem',
              border: '1px solid rgba(16,24,40,0.08)',
              marginBottom: (result.stats.sheetResults || result.errors.length > 0) ? '1rem' : 0,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.75rem' }}>
                {[
                  { label: 'Nouveaux produits', value: result.stats.productsCreated, color: '#2e7d32' },
                  { label: 'Mis à jour', value: result.stats.productsUpdated, color: '#DC7F00' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '1.35rem', fontWeight: 700, color: s.color }}>
                      {s.value}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.65 }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.76rem', opacity: 0.58, lineHeight: 1.5 }}>
                Le catalogue n&apos;est plus effacé à chaque import. Un produit absent du fichier reste visible
                jusqu&apos;à ce que Joel le <strong>masque</strong> dans Admin → Fournisseurs → Produits.
              </p>
            </div>
          ) : result.stats.importStrategy === 'replace' ? (
            <div style={{
              background: '#fff', borderRadius: 8, padding: '1rem',
              border: '1px solid rgba(16,24,40,0.08)',
              marginBottom: (result.stats.sheetResults || result.errors.length > 0) ? '1rem' : 0,
            }}>
              <p style={{ margin: '0 0 0.35rem', fontSize: '1.35rem', fontWeight: 700, color: '#1565c0' }}>
                {result.stats.productsCreated}
              </p>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>
                Produits au catalogue après import
              </p>
              <p style={{ margin: '0.45rem 0 0', fontSize: '0.76rem', opacity: 0.58, lineHeight: 1.5 }}>
                Pour les fiches locales, l&apos;ancienne liste du fournisseur est <strong>supprimée</strong> puis remplacée par le fichier : ce sont des nouvelles lignes en base (nouveaux identifiants).
                Ce n&apos;est pas un « UPDATE » ligne à ligne — d&apos;où l&apos;absence de compteur « Mis à jour ». Fonctionnellement, c&apos;est bien une <strong>mise à jour du catalogue</strong> pour la semaine.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.75rem', marginBottom: (result.stats.sheetResults || result.errors.length > 0) ? '1rem' : 0 }}>
              {[
                { label: 'Produits créés', value: result.stats.productsCreated, color: '#2e7d32' },
                { label: 'Mis à jour', value: result.stats.productsUpdated, color: '#DC7F00' },
              ].map(s => (
                <div key={s.label} style={{
                  background: '#fff', borderRadius: 8, padding: '0.75rem',
                  textAlign: 'center', border: '1px solid rgba(16,24,40,0.08)',
                }}>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '1.5rem', fontWeight: 700, color: s.color }}>
                    {s.value}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.65 }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}
          {result.stats.sheetResults && Object.keys(result.stats.sheetResults).length > 0 && (
            <div style={{ marginBottom: result.errors.length > 0 ? '1rem' : 0 }}>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.83rem', opacity: 0.8 }}>
                Détail par fournisseur :
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {Object.entries(result.stats.sheetResults).map(([sheet, info]) => (
                  <div key={sheet} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.8rem', padding: '0.3rem 0.6rem',
                    background: '#fff', borderRadius: 6,
                    border: '1px solid rgba(16,24,40,0.07)',
                  }}>
                    <span style={{ fontWeight: 600 }}>{info.supplierName}</span>
                    <span style={{ opacity: 0.6 }}>{info.count} produit{info.count > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.errors.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <p style={{ margin: '0 0 0.4rem', fontWeight: 600, fontSize: '0.83rem', opacity: 0.8 }}>
                {result.errors.length} ligne(s) ignorée(s) :
              </p>
              <ul style={{ margin: 0, padding: '0 0 0 1.25rem', fontSize: '0.78rem', opacity: 0.65 }}>
                {result.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
