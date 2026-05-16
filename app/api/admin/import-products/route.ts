import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

type CsvRow = {
  nom: string
  description: string
  categorie: string
  unite: string
  prix_unitaire: string
  quantite_min: string
  date_limite_commande: string
  fournisseur_nom: string
  fournisseur_type: string
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])) as CsvRow
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Vérification admin basique : seul l'admin peut importer
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? 'info@leptitmag.org'
  if (user.email !== adminEmail && user.email !== 'georgina.berrezel@gmail.com') {
    return NextResponse.json({ error: 'Accès réservé à l\'administrateur.' }, { status: 403 })
  }

  // Lire le fichier CSV depuis le body multipart
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 })
  }

  const text = await file.text()
  const rows = parseCsv(text)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Le fichier CSV est vide ou mal formaté.' }, { status: 400 })
  }

  let suppliersCreated = 0
  let productsCreated = 0
  let productsUpdated = 0
  const errors: string[] = []

  // Cache des fournisseurs déjà traités dans cette session
  const supplierCache = new Map<string, string>()

  for (const row of rows) {
    if (!row.nom || !row.fournisseur_nom) {
      errors.push(`Ligne ignorée (nom ou fournisseur manquant) : ${JSON.stringify(row)}`)
      continue
    }

    try {
      // 1. Créer ou récupérer le fournisseur
      let supplierId = supplierCache.get(row.fournisseur_nom)

      if (!supplierId) {
        const { data: existingSupplier } = await supabase
          .from('suppliers')
          .select('id')
          .eq('name', row.fournisseur_nom)
          .single()

        if (existingSupplier) {
          supplierId = existingSupplier.id
        } else {
          const validTypes = ['local', 'grossiste_bio', 'autre']
          const supplierType = validTypes.includes(row.fournisseur_type) ? row.fournisseur_type : 'autre'

          const { data: newSupplier, error: supplierError } = await supabase
            .from('suppliers')
            .insert({ name: row.fournisseur_nom, type: supplierType, active: true })
            .select('id')
            .single()

          if (supplierError || !newSupplier) {
            errors.push(`Impossible de créer le fournisseur "${row.fournisseur_nom}" : ${supplierError?.message}`)
            continue
          }

          supplierId = newSupplier.id
          suppliersCreated++
        }

        supplierCache.set(row.fournisseur_nom, supplierId!)
      }

      // 2. Préparer les données produit
      const productData = {
        name: row.nom,
        description: row.description || null,
        category: row.categorie || null,
        unit: row.unite || 'pièce',
        unit_price: row.prix_unitaire ? parseFloat(row.prix_unitaire) : null,
        min_quantity: row.quantite_min ? parseInt(row.quantite_min) : 1,
        order_deadline: row.date_limite_commande || null,
        supplier_id: supplierId,
        active: true,
      }

      // 3. Upsert du produit (mise à jour si même nom + fournisseur, sinon création)
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('name', row.nom)
        .eq('supplier_id', supplierId)
        .single()

      if (existingProduct) {
        await supabase
          .from('products')
          .update(productData)
          .eq('id', existingProduct.id)
        productsUpdated++
      } else {
        const { error: productError } = await supabase
          .from('products')
          .insert(productData)

        if (productError) {
          errors.push(`Produit "${row.nom}" : ${productError.message}`)
        } else {
          productsCreated++
        }
      }
    } catch (err) {
      errors.push(`Erreur inattendue sur "${row.nom}" : ${err}`)
    }
  }

  return NextResponse.json({
    success: true,
    stats: { suppliersCreated, productsCreated, productsUpdated, errors: errors.length },
    errors,
    message: `Import terminé : ${productsCreated} produit(s) créé(s), ${productsUpdated} mis à jour, ${suppliersCreated} fournisseur(s) créé(s).`,
  })
}
