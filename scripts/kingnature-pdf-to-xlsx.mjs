/**
 * Convertit la Preisliste kingnature (PDF) en .xlsx simplifié pour import Dr Jacob's.
 * Usage : node scripts/kingnature-pdf-to-xlsx.mjs [chemin.pdf] [sortie.xlsx]
 *
 * Le PDF a des paliers de prix (1-2, 3-5…) — on retient le palier « 1-2 » (premier prix revendeur).
 * Joel peut corriger les prix dans Excel avant import Admin → Dr Jacob's.
 */

import fs from 'fs'
import path from 'path'
import { PDFParse } from 'pdf-parse'
import ExcelJS from 'exceljs'

const inputPath = process.argv[2] ?? path.join(process.env.HOME ?? '', 'Downloads/Preisliste CHF Reseller_05.2026.pdf')
const outputPath = process.argv[3] ?? path.join(process.cwd(), 'docs/kingnature-preisliste-import.xlsx')

if (!fs.existsSync(inputPath)) {
  console.error('Fichier introuvable :', inputPath)
  process.exit(1)
}

const buf = fs.readFileSync(inputPath)
const parser = new PDFParse({ data: buf })
const { text } = await parser.getText()
await parser.destroy()

/** Ligne produit : nom + article + EAN + contenu + premier prix revendeur */
const productRe =
  /^([A-Za-zÀ-ÿ0-9][^\d\n]{4,}?)\s+(\d+[A-Z]?)\s+(\d{13})\s+(\d+)\s+(.+?)\s+(\d+[.,]\d{2})\s/m

const lines = text.split(/\n/)
const products = []

for (const line of lines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('kingnature') || trimmed.startsWith('Preisliste')) continue
  if (/^-- \d+ of \d+ --$/.test(trimmed)) continue
  if (/^\d+[.,]\d{2}/.test(trimmed)) continue

  // Format courant : Nom … Article EAN pharma … contenu … prix1 prix2 …
  const m = trimmed.match(
    /^(.+?)\s+(\d+[A-Z]?)\s+(\d{13})\s+\d+\s+(.+?)\s+(\d+[.,]\d{2})/,
  )
  if (!m) continue

  const [, name, article, , content, priceRaw] = m
  const price = parseFloat(priceRaw.replace(',', '.'))
  if (Number.isNaN(price)) continue

  products.push({
    name: name.trim(),
    article: article.trim(),
    content: content.trim(),
    price,
  })
}

// Dédupliquer par article
const byArticle = new Map()
for (const p of products) {
  if (!byArticle.has(p.article)) byArticle.set(p.article, p)
}

const rows = [...byArticle.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'))

const wb = new ExcelJS.Workbook()
const ws = wb.addWorksheet('Produits')
ws.columns = [
  { header: 'Produit', key: 'name', width: 42 },
  { header: 'Article', key: 'article', width: 12 },
  { header: 'Contenu', key: 'content', width: 28 },
  { header: 'Prix', key: 'price', width: 10 },
  { header: 'Unité', key: 'unit', width: 12 },
]

for (const p of rows) {
  const unitMatch = p.content.match(/\d+\s*(ml|g|Stk\.|Kapseln|Presslinge|Sachets|Sticks)/i)
  const unit = unitMatch ? unitMatch[1].replace('Stk.', 'pièce') : 'pièce'
  ws.addRow({
    name: p.name,
    article: p.article,
    content: p.content,
    price: p.price,
    unit,
  })
}

await wb.xlsx.writeFile(outputPath)
console.log(`✓ ${rows.length} produits → ${outputPath}`)
console.log('  Vérifier les prix (palier 1-2) avant import Admin → Dr Jacob\'s')
