'use client'

import { use, useRef, useState } from 'react'

type ImportResult = {
  success: boolean
  message: string
  stats: { suppliersCreated: number; productsCreated: number; productsUpdated: number; errors: number }
  errors: string[]
}

export default function ImportPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  use(params)

  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/admin/import-products', {
      method: 'POST',
      body: formData,
    })

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

  return (
    <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: 680 }}>

      {/* Fil d'ariane */}
      <nav aria-label="Fil d'ariane" style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        fontSize: '0.8rem', marginBottom: '1.5rem',
        color: 'rgba(16,24,40,0.4)',
      }}>
        <span>Admin</span>
        <span aria-hidden>›</span>
        <span style={{ color: 'rgba(16,24,40,0.75)', fontWeight: 600 }}>Import produits</span>
      </nav>

      <h1 style={{ marginBottom: '0.25rem' }}>Import produits CSV</h1>
      <p style={{ opacity: 0.65, marginBottom: '2rem' }}>
        Importez ou mettez à jour les produits du catalogue depuis un fichier CSV.
      </p>

      {/* Format attendu */}
      <div style={{
        background: '#f8f9fa', borderRadius: 12, padding: '1.25rem 1.5rem',
        marginBottom: '2rem', border: '1px solid #e8e8e8',
      }}>
        <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.9rem' }}>
          Format CSV attendu (colonnes obligatoires en gras) :
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: '0.8rem', borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ background: '#eee' }}>
                {['nom *', 'description', 'categorie', 'unite *', 'prix_unitaire', 'quantite_min', 'date_limite_commande', 'fournisseur_nom *', 'fournisseur_type *'].map(h => (
                  <th key={h} style={{ padding: '0.4rem 0.6rem', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: h.includes('*') ? 700 : 400 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '0.4rem 0.6rem' }}>Farine T65 bio</td>
                <td style={{ padding: '0.4rem 0.6rem' }}>1 kg</td>
                <td style={{ padding: '0.4rem 0.6rem' }}>Epicerie</td>
                <td style={{ padding: '0.4rem 0.6rem' }}>sac</td>
                <td style={{ padding: '0.4rem 0.6rem' }}>3.20</td>
                <td style={{ padding: '0.4rem 0.6rem' }}>2</td>
                <td style={{ padding: '0.4rem 0.6rem' }}>2026-06-30</td>
                <td style={{ padding: '0.4rem 0.6rem' }}>Biopartner</td>
                <td style={{ padding: '0.4rem 0.6rem' }}>grossiste_bio</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', opacity: 0.6 }}>
          fournisseur_type : <code>local</code> | <code>grossiste_bio</code> | <code>autre</code>
          &nbsp;·&nbsp; date format : <code>AAAA-MM-JJ</code>
          &nbsp;·&nbsp; Si le produit existe déjà (même nom + fournisseur), il sera mis à jour.
        </p>
      </div>

      {/* Zone de dépôt */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${file ? '#2e7d32' : 'rgba(16,24,40,0.2)'}`,
          borderRadius: 12,
          padding: '2.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: file ? '#f1f8f1' : '#fafafa',
          transition: 'all 0.2s',
          marginBottom: '1.5rem',
        }}
      >
        <p style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>{file ? '✓' : '📄'}</p>
        <p style={{ margin: 0, fontWeight: 600 }}>
          {file ? file.name : 'Cliquer pour choisir un fichier CSV'}
        </p>
        {file && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', opacity: 0.6 }}>
            {(file.size / 1024).toFixed(1)} Ko
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Bouton import */}
      <button
        onClick={handleImport}
        disabled={!file || loading}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: !file || loading ? '#ccc' : '#1a1a2e',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: '1rem',
          cursor: !file || loading ? 'not-allowed' : 'pointer',
          marginBottom: '1.5rem',
        }}
      >
        {loading ? 'Import en cours…' : 'Lancer l\'import'}
      </button>

      {/* Erreur */}
      {error && (
        <div style={{
          background: '#fdf2f2', border: '1px solid #f5c6c6',
          borderRadius: 10, padding: '1rem 1.25rem', color: '#c0392b',
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
          <p style={{ margin: '0 0 1rem', fontWeight: 700, fontSize: '1rem' }}>
            {result.stats.errors === 0 ? '✓ ' : '⚠ '}{result.message}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: result.errors.length > 0 ? '1rem' : 0 }}>
            {[
              { label: 'Produits créés', value: result.stats.productsCreated, color: '#2e7d32' },
              { label: 'Mis à jour', value: result.stats.productsUpdated, color: '#DC7F00' },
              { label: 'Fournisseurs créés', value: result.stats.suppliersCreated, color: '#1a1a2e' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#fff', borderRadius: 8, padding: '0.75rem',
                textAlign: 'center', border: '1px solid rgba(16,24,40,0.08)',
              }}>
                <p style={{ margin: '0 0 0.2rem', fontSize: '1.6rem', fontWeight: 700, color: s.color }}>
                  {s.value}
                </p>
                <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.65 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {result.errors.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.8 }}>
                {result.errors.length} ligne(s) en erreur :
              </p>
              <ul style={{ margin: 0, padding: '0 0 0 1.25rem', fontSize: '0.8rem', opacity: 0.7 }}>
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
