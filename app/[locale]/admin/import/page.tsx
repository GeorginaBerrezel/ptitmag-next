'use client'

import { use, useRef, useState } from 'react'

type ImportResult = {
  success: boolean
  message: string
  stats: { productsCreated: number; productsUpdated: number; errors: number }
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
}

const SUPPLIERS: SupplierOption[] = [
  {
    key: 'biopartner',
    label: 'Biopartner',
    type: 'grossiste_bio',
    endpoint: '/api/admin/import-biopartner',
    fileHint: 'Liste de commandes personnelle (.csv)',
    fileInstructions: (
      <>
        <strong>1.</strong> Se connecter sur{' '}
        <a href="https://shop.biopartner.ch" target="_blank" rel="noreferrer"
          style={{ color: '#1e5c35', fontWeight: 600 }}>shop.biopartner.ch</a>
        {' '}→ télécharger la <strong>«&nbsp;Liste de commandes personnelle&nbsp;»</strong> (CSV)<br />
        <strong>2.</strong> Saisir la date limite ci-dessous et importer le fichier.{' '}
        <span style={{ opacity: 0.7 }}>Les ~1 380 articles sont mis à jour en quelques secondes.</span>
      </>
    ),
  },
  {
    key: 'bioterroir',
    label: 'Bioterroir',
    type: 'local',
    endpoint: '/api/admin/import-supplier',
    fileHint: 'Feuil2-Table 1.csv (fichier avec les codes articles)',
    fileInstructions: (
      <>
        Utiliser le fichier <strong>«&nbsp;Feuil2-Table 1.csv&nbsp;»</strong> (pas Feuil1).<br />
        Ce fichier contient les codes articles Bioterroir, les noms, unités et prix HT (TVA 2.6% non comprise).
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
        Le prix importé est le tarif à l'unité (colonne «&nbsp;1&nbsp;»). Compléments alimentaires.
      </>
    ),
  },
  {
    key: 'naturmel',
    label: 'NaturMel (M\'Cosmetics)',
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
]

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
  const [selectedKey, setSelectedKey] = useState<string>('biopartner')
  const [file, setFile] = useState<File | null>(null)
  const [dateLimite, setDateLimite] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supplier = SUPPLIERS.find(s => s.key === selectedKey)!

  function handleSupplierChange(key: string) {
    setSelectedKey(key)
    setFile(null)
    setResult(null)
    setError(null)
    setDateLimite('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleImport() {
    if (!file || !supplier) return
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    if (dateLimite) formData.append('date_limite_commande', dateLimite)
    // Pour la route unifiée, on passe la clé fournisseur
    if (supplier.endpoint !== '/api/admin/import-biopartner') {
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

      {/* Sélecteur fournisseur */}
      <div style={{ marginBottom: '1.75rem' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          Fournisseur
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {SUPPLIERS.map(s => {
            const b = TYPE_BADGE[s.type]
            const active = s.key === selectedKey
            return (
              <button
                key={s.key}
                onClick={() => handleSupplierChange(s.key)}
                style={{
                  padding: '0.6rem 0.5rem',
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
                <span style={{
                  display: 'inline-block',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.4rem',
                  borderRadius: 999,
                  background: active ? 'rgba(255,255,255,0.15)' : b.bg,
                  color: active ? '#fff' : b.color,
                  marginBottom: '0.25rem',
                }}>
                  {b.label}
                </span>
                <br />
                {s.label}
              </button>
            )
          })}
        </div>
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

      {/* Date limite */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          Date limite de commande
        </label>
        <input
          type="datetime-local"
          value={dateLimite}
          onChange={e => setDateLimite(e.target.value)}
          style={{
            width: '100%',
            padding: '0.65rem 0.9rem',
            border: '1.5px solid rgba(16,24,40,0.15)',
            borderRadius: 8,
            fontSize: '0.95rem',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', opacity: 0.5 }}>
          Exemple : jeudi 21 mai 12h00 → <code>2026-05-21T12:00</code>
        </p>
      </div>

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
            Format CSV
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.75rem', marginBottom: result.errors.length > 0 ? '1rem' : 0 }}>
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
