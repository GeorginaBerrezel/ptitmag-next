'use client'

import { use, useRef, useState } from 'react'

type ImportResult = {
  success: boolean
  message: string
  stats: {
    productsCreated: number
    productsUpdated: number
    errors: number
    sheetResults?: Record<string, { count: number; supplierName: string }>
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
        fileHint: 'Feuille de commande hebdomadaire_vX_JJ.MM.AAAA_TONNOM.xlsx',
        acceptsXlsx: true,
        fileInstructions: (
          <>
            <strong>Un seul fichier Excel</strong> pour importer tous les producteurs locaux de la semaine.<br />
            Onglets importés : <strong>Bioterroir, Fermette à Didi, Graines d&apos;Avenir, Brasseries d&apos;Ayent, Vins bio et nature, Truffes</strong>.<br />
            <span style={{ opacity: 0.75 }}>L&apos;onglet Biopartner est ignoré (import séparé via CSV).</span>
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
        fileHint: 'Bioterroir JJ.MM.AAAA.xlsx',
        acceptsXlsx: true,
        deadlineGroup: 'jeudi',
        fileInstructions: <>Légumes & fruits. Prix d&apos;achat HT (TVA 2.6% non comprise).</>,
      },
      {
        key: 'fermette_didi',
        label: 'Fermette à Didi',
        type: 'local',
        endpoint: '/api/admin/import-local-supplier',
        fileHint: 'Fermette à Didi JJ.MM.AAAA.xlsx',
        acceptsXlsx: true,
        deadlineGroup: 'jeudi',
        fileInstructions: <>Produits fermiers (œufs, fromages, charcuterie). Prix TTC.</>,
      },
      {
        key: 'graines_avenir',
        label: "Graines d'Avenir",
        type: 'local',
        endpoint: '/api/admin/import-local-supplier',
        fileHint: "Graines d'avenir JJ.MM.AAAA.xlsx",
        acceptsXlsx: true,
        deadlineGroup: 'mercredi',
        fileInstructions: <>Pains & pâtisseries. <strong style={{ color: '#b45309' }}>Délai mercredi 18h30</strong> — commander avant les autres.</>,
      },
      {
        key: 'brasseries_ayent',
        label: "Brasseries d'Ayent",
        type: 'local',
        endpoint: '/api/admin/import-local-supplier',
        fileHint: "Brasseries d'Ayent.xlsx",
        acceptsXlsx: true,
        deadlineGroup: 'jeudi',
        fileInstructions: <>Bières artisanales valaisannes. Prix TTC.</>,
      },
      {
        key: 'vins_bio',
        label: 'Vins bio et nature',
        type: 'local',
        endpoint: '/api/admin/import-local-supplier',
        fileHint: 'Vins bio et nature.xlsx',
        acceptsXlsx: true,
        deadlineGroup: 'jeudi',
        fileInstructions: <>Vins bio valaisans (Chèrouche, Olivier & Stéphanie). Prix TTC.</>,
      },
      {
        key: 'truffes',
        label: 'Truffes',
        type: 'local',
        endpoint: '/api/admin/import-local-supplier',
        fileHint: 'Truffes.xlsx',
        acceptsXlsx: true,
        deadlineGroup: 'mercredi',
        fileInstructions: <>Truffes au chocolat cru. <strong style={{ color: '#b45309' }}>Délai mercredi 18h30</strong> — commander avant les autres.</>,
      },
    ],
  },
  {
    label: 'Grossistes bio',
    suppliers: [
      {
        key: 'biopartner',
        label: 'Biopartner',
        type: 'grossiste_bio',
        endpoint: '/api/admin/import-biopartner',
        fileHint: 'Liste de commandes personnelle (.csv)',
        deadlineGroup: 'jeudi',
        fileInstructions: (
          <>
            <strong>1.</strong> Se connecter sur{' '}
            <a href="https://shop.biopartner.ch" target="_blank" rel="noreferrer"
              style={{ color: '#1e5c35', fontWeight: 600 }}>shop.biopartner.ch</a>
            {' '}→ télécharger la <strong>«&nbsp;Liste de commandes personnelle&nbsp;»</strong> (CSV)<br />
            <strong>2.</strong> Saisir le délai jeudi ci-dessous et importer.{' '}
            <span style={{ opacity: 0.7 }}>Les ~1 380 articles sont mis à jour en quelques secondes.</span>
          </>
        ),
      },
      {
        key: 'cave_levain',
        label: 'Cave à levain',
        type: 'local',
        endpoint: '/api/admin/import-supplier',
        fileHint: 'Formulaire commande Cave à levain.csv',
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
        fileHint: 'liste prix dailles ... .csv',
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
        fileHint: 'Commande Novoma - XXXX.csv',
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
        fileHint: 'NaturMel - Formulaire de commande ... .csv',
        fileInstructions: (
          <>
            Importer le <strong>formulaire NaturMel</strong>.<br />
            Le prix importé est le tarif revendeur (&lt;&nbsp;5 pièces). Cosmétiques bio.
          </>
        ),
      },
    ],
  },
]

// Liste plate pour la recherche par clé
const SUPPLIERS: SupplierOption[] = SUPPLIER_GROUPS.flatMap(g => g.suppliers)

const TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  local: { label: 'Local', bg: '#e8f5e9', color: '#2e7d32' },
  grossiste_bio: { label: 'Grossiste bio', bg: '#e3f2fd', color: '#1565c0' },
}

export default function ImportPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  use(params)

  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedKey, setSelectedKey] = useState<string>('feuille_hebdo')
  const [file, setFile] = useState<File | null>(null)
  const [dateLimite, setDateLimite] = useState('')
  // Délais spécifiques à la feuille hebdomadaire (deux groupes)
  const [dateLimiteMercredi, setDateLimiteMercredi] = useState('')
  const [dateLimiteJeudi, setDateLimiteJeudi] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supplier = SUPPLIERS.find(s => s.key === selectedKey)!
  const isHebdo = selectedKey === 'feuille_hebdo'

  function handleSupplierChange(key: string) {
    setSelectedKey(key)
    setFile(null)
    setResult(null)
    setError(null)
    setDateLimite('')
    setDateLimiteMercredi('')
    setDateLimiteJeudi('')
    if (fileRef.current) fileRef.current.value = ''
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

      {/* Fil d'ariane */}
      <nav aria-label="Fil d'ariane" style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        fontSize: '0.8rem', marginBottom: '1.5rem',
        color: 'rgba(16,24,40,0.4)',
      }}>
        <span>Admin</span>
        <span aria-hidden>›</span>
        <span style={{ color: 'rgba(16,24,40,0.75)', fontWeight: 600 }}>Import catalogue</span>
      </nav>

      <h1 style={{ marginBottom: '0.25rem' }}>Import catalogue</h1>
      <p style={{ opacity: 0.65, marginBottom: '2rem' }}>
        Sélectionnez le fournisseur et importez leur fichier pour mettre à jour le catalogue.
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

      {/* Dates limites */}
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

      {/* Zone de dépôt */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
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
        <p style={{ margin: '0 0 0.35rem', fontSize: '1.4rem' }}>{file ? '✓' : '📄'}</p>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem' }}>
          {file ? file.name : `Déposer le fichier ${supplier.fileHint}`}
        </p>
        {file ? (
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', opacity: 0.55 }}>
            {(file.size / 1024).toFixed(1)} Ko · Cliquer pour changer
          </p>
        ) : (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', opacity: 0.45 }}>
            Format {supplier.acceptsXlsx ? 'Excel (.xlsx)' : 'CSV'}
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={supplier.acceptsXlsx
            ? '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : '.csv,text/csv'}
          style={{ display: 'none' }}
          onChange={e => {
            setFile(e.target.files?.[0] ?? null)
            setResult(null)
            setError(null)
          }}
        />
      </div>

      {/* Bouton */}
      <button
        onClick={handleImport}
        disabled={!file || loading}
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
        {loading
          ? 'Import en cours…'
          : `Importer ${supplier.label}`}
      </button>

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
