// Utilitaires partagés pour l'import des fournisseurs locaux (xlsx)
// Utilisé par import-hebdo (feuille complète) et import-local-supplier (fichier individuel).

export type ParsedProduct = {
  name: string
  category: string
  unit: string
  unitPrice: number
}

export type LocalSupplierConfig = {
  supplierName: string
  supplierType: 'local' | 'grossiste_bio' | 'autre'
  category: string
  // Groupe de délai : 'mercredi' = Graines d'Avenir + Truffes, 'jeudi' = tous les autres
  deadlineGroup: 'mercredi' | 'jeudi'
}

// ─── Mapping clé → config ────────────────────────────────────────────────────
// La même clé est utilisée dans :
//   - import-hebdo     : indexé par nom d'onglet Excel
//   - import-local     : indexé par clé de formulaire (supplier=bioterroir, etc.)

export const LOCAL_SUPPLIER_CONFIG: Record<string, LocalSupplierConfig> = {
  bioterroir:       { supplierName: 'Bioterroir',             supplierType: 'local', category: 'Légumes & fruits',       deadlineGroup: 'jeudi'    },
  fermette_didi:    { supplierName: 'Fermette à Didi',         supplierType: 'local', category: 'Produits fermiers',       deadlineGroup: 'jeudi'    },
  graines_avenir:   { supplierName: "Graines d'Avenir",        supplierType: 'local', category: 'Boulangerie',             deadlineGroup: 'mercredi' },
  brasseries_ayent: { supplierName: "Brasseries d'Ayent",      supplierType: 'local', category: 'Bières',                  deadlineGroup: 'jeudi'    },
  vins_bio:         { supplierName: 'Vins bio et nature',      supplierType: 'local', category: 'Vins',                    deadlineGroup: 'jeudi'    },
  truffes:          { supplierName: 'Truffes au chocolat cru', supplierType: 'local', category: 'Chocolats & confiseries', deadlineGroup: 'mercredi' },
}

// Même mapping pour la feuille hebdo (indexé par nom d'onglet Excel)
export const HEBDO_SHEET_CONFIG: Record<string, LocalSupplierConfig> = {
  'Bioterroir':         LOCAL_SUPPLIER_CONFIG.bioterroir,
  'Fermette à Didi':    LOCAL_SUPPLIER_CONFIG.fermette_didi,
  "Graines d'Avenir":   LOCAL_SUPPLIER_CONFIG.graines_avenir,
  "Brasseries d'Ayent": LOCAL_SUPPLIER_CONFIG.brasseries_ayent,
  'Vins bio et nature': LOCAL_SUPPLIER_CONFIG.vins_bio,
  'Truffes':            LOCAL_SUPPLIER_CONFIG.truffes,
}

// ─── Parser commun ────────────────────────────────────────────────────────────
// Format attendu (identique dans tous les onglets hebdo et fichiers individuels) :
//   - Ligne titre  : "Nom fournisseur – Livraison…"
//   - Ligne en-têtes : ["Produit","","Quantité","","Prix d'achat TTC/HT","","Total TTC"]
//   - Lignes produits : [nom, "", "", "", prix(number), unité(string), 0]
//   - Dernière ligne  : ["","","","","","Total TTC",0]

export function parseLocalSheet(rows: unknown[][], category: string): ParsedProduct[] {
  const products: ParsedProduct[] = []

  const headerIdx = rows.findIndex(r =>
    typeof r[0] === 'string' && r[0].trim().toLowerCase() === 'produit'
  )
  if (headerIdx === -1) return []

  for (const row of rows.slice(headerIdx + 1)) {
    const name  = typeof row[0] === 'string' ? row[0].trim() : ''
    const price = typeof row[4] === 'number' ? row[4] : parseFloat(String(row[4] ?? ''))
    const unit  = (typeof row[5] === 'string' ? row[5] : String(row[5] ?? '')).trim()

    if (!name) continue
    if (unit.toLowerCase().includes('total')) continue
    if (isNaN(price) || price <= 0) continue

    products.push({ name, category, unit: unit || 'pièce', unitPrice: price })
  }

  return products
}
