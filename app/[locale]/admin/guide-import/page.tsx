import { Link } from '@/i18n/navigation'
import styles from './guide-import.module.css'

export default async function GuideImportPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div className={`container ${styles.page}`}>
      <h1 style={{ marginBottom: '0.35rem' }}>Guide import — formats &amp; colonnes</h1>
      <p className={styles.intro}>
        Deux façons de structurer un fichier, et deux extensions possibles (<strong>.xlsx</strong> ou <strong>.csv</strong>)
        avec <em>le même contenu</em>. Le site lit les colonnes et remplit le catalogue automatiquement.
      </p>

      <div className={styles.actions}>
        <Link href="/admin/import" locale={locale} className={`${styles.btn} ${styles.btnPrimary}`}>
          → Import produits
        </Link>
      </div>

      {/* Règle générale */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Règle générale</h2>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.summaryTable}`}>
            <thead>
              <tr>
                <th>Extension</th>
                <th>Quand l&apos;utiliser</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>.xlsx</strong></td>
                <td>Fichier Excel — recommandé (moins d&apos;erreurs d&apos;export)</td>
              </tr>
              <tr>
                <td><strong>.csv</strong></td>
                <td>Même tableau, enregistré avec séparateur <strong>point-virgule ;</strong> et encodage <strong>UTF-8</strong></td>
              </tr>
              <tr>
                <td><strong>.pdf</strong></td>
                <td>❌ Non importable — ouvrir dans Excel puis .xlsx ou .csv</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={styles.warn}>
          <strong>Exception :</strong> la <em>feuille hebdo complète</em> (tous les locaux en un fichier) nécessite un
          <strong> .xlsx avec plusieurs onglets</strong>. Pour le .csv, importer chaque fournisseur séparément.
        </p>
      </section>

      {/* TYPE COMPLEXE */}
      <section className={styles.section}>
        <span className={`${styles.badge} ${styles.badgeBio}`}>Type complexe — Biopartner uniquement</span>
        <h2 className={styles.sectionTitle}>Biopartner (Général, Emballages, Surgelés, Viandes)</h2>
        <p className={styles.sectionSub}>
          Fichier officiel Biopartner avec des dizaines de colonnes. Le site repère la ligne <code>Article</code> en
          colonne A, puis importe chaque produit. Utilisable en <strong>.xlsx</strong> ou <strong>.csv</strong>.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Col.</th>
                <th>En-tête</th>
                <th>→ Catalogue site</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>A</td><td><code>Article</code></td><td>Réf. fournisseur</td></tr>
              <tr><td>B + C</td><td><code>Désignation</code> + <code>Désignation 2</code></td><td>Nom du produit</td></tr>
              <tr><td>F</td><td><code>UM</code></td><td>0 = HT (+ TVA) · 1 = déjà TTC</td></tr>
              <tr><td>G</td><td><code>UC</code></td><td>Quantité minimum</td></tr>
              <tr><td>J</td><td><code>Prix</code></td><td>Prix catalogue</td></tr>
              <tr><td>V</td><td><code>Categorie produit</code></td><td>Menu catégories</td></tr>
              <tr><td>Z</td><td><code>TVA</code></td><td>2,6&nbsp;% ou 8,1&nbsp;% si UM = 0</td></tr>
            </tbody>
          </table>
        </div>
        <div className={styles.example}>
          <strong>Exemple concret</strong>
          Savon mandarine · Article <code>500600396</code> · Prix <code>9,39</code> · UM <code>0</code> ·
          TVA «&nbsp;normal 8.1%&nbsp;» → <strong>10,15 CHF</strong> affiché sur le site.
        </div>
        <pre className={styles.preBlock}>{`Article;Désignation;…;UM;UC;…;Prix;…;Categorie produit;…;TVA
500600396;Savon de Marseille corporel mandarine;…;0;1;…;9,39;…;Hygiène;…;Taux TVA normal 8.1%`}</pre>
        <p className={styles.note}>
          <strong>Où importer :</strong> Admin → Import → Biopartner → choisir le catalogue (Général, etc.).
        </p>
      </section>

      {/* TYPE SIMPLE A */}
      <section className={styles.section}>
        <span className={`${styles.badge} ${styles.badgeLocal}`}>Type simple A — format Joel (locaux)</span>
        <h2 className={styles.sectionTitle}>Producteurs locaux &amp; feuille hebdo</h2>
        <p className={styles.sectionSub}>
          Le fichier que Joel prépare déjà : une ligne d&apos;en-tête avec <code>Produit</code>, puis nom, prix et unité.
          Fonctionne en <strong>.xlsx</strong> ou <strong>.csv</strong>.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Colonne</th>
                <th>Contenu</th>
                <th>→ Catalogue site</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Produit</td><td>Nom (ex. Tomates cerises)</td><td>Nom affiché</td></tr>
              <tr><td>Prix (souvent col. D)</td><td>3,80 ou CHF 3,80</td><td>Prix catalogue</td></tr>
              <tr><td>Unité (souvent col. E)</td><td>kg, pièce, bouteille…</td><td>Unité de commande</td></tr>
              <tr><td>—</td><td>Fournisseur choisi à l&apos;import</td><td>Catégorie (Légumes, Vins…)</td></tr>
            </tbody>
          </table>
        </div>
        <div className={styles.example}>
          <strong>Exemple Truffes</strong>
          Produit «&nbsp;Truffe noire 75%&nbsp;» · 3,50 CHF · pièce
        </div>
        <pre className={styles.preBlock}>{`Produit;;;Prix d'achat TTC;
Truffe noire 75%;;;3,50;pièce
Truffe blanche 75%;;;3,50;pièce`}</pre>
        <p className={styles.note}>
          <strong>Bioterroir :</strong> parfois 2 prix (HT + TTC) — le site garde le <strong>TTC</strong>.
        </p>
      </section>

      {/* TYPE SIMPLE B */}
      <section className={styles.section}>
        <span className={`${styles.badge} ${styles.badgeGeneric}`}>Type simple B — gabarit universel</span>
        <h2 className={styles.sectionTitle}>Tous les autres fournisseurs (Cave à levain, Novoma, nouveaux…)</h2>
        <p className={styles.sectionSub}>
          Le modèle que Joel peut utiliser pour un <strong>nouveau petit fournisseur</strong> : une ligne d&apos;en-tête,
          une ligne = un produit. Même fichier en <strong>.xlsx</strong> ou <strong>.csv</strong> (; UTF-8).
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Colonne</th>
                <th>Obligatoire</th>
                <th>→ Catalogue site</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>nom</code></td><td>Oui</td><td>Nom du produit</td></tr>
              <tr><td><code>prix</code></td><td>Oui</td><td>Prix catalogue (nombre, ex. 12.50)</td></tr>
              <tr><td><code>categorie</code></td><td>Non</td><td>Rayon (sinon «&nbsp;Autres&nbsp;»)</td></tr>
              <tr><td><code>unite</code></td><td>Non</td><td>kg, pièce, pot… (défaut : pièce)</td></tr>
              <tr><td><code>ref</code></td><td>Non</td><td>Code article fournisseur</td></tr>
            </tbody>
          </table>
        </div>
        <pre className={styles.preBlock}>{`nom;prix;categorie;unite;ref
Miel de montagne;12.50;Épicerie;pot;MIEL-01
Confiture abricot;8.00;Épicerie;pot;CONF-02
Fromage frais;6.80;Produits laitiers;pièce;`}</pre>
        <p className={styles.note}>
          Les en-têtes <code>name</code>, <code>produit</code>, <code>designation</code>, <code>price</code>,{' '}
          <code>tarif</code> sont aussi reconnus.
        </p>
        <p className={styles.note} style={{ marginTop: '0.5rem' }}>
          <strong>Fournisseurs avec fichier «&nbsp;maison&nbsp;»</strong> (Cave à levain, Novoma, NaturMel…) : garder
          leur mise en page habituelle en .xlsx ou .csv — le site a un lecteur dédié. Le gabarit ci-dessus sert pour
          un <em>nouveau</em> fournisseur ou si Joel refait un fichier simple.
        </p>
      </section>

      {/* Qui utilise quoi */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quel type pour quel fournisseur ?</h2>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.summaryTable}`}>
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>Type de fichier</th>
                <th>.xlsx / .csv</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Biopartner (×4)</td><td><strong>Complexe</strong></td><td>✅ ✅</td></tr>
              <tr><td>Bioterroir, Didi, Graines d&apos;Avenir…</td><td><strong>Simple A</strong> (ou B)</td><td>✅ ✅</td></tr>
              <tr><td>Feuille hebdo (tous locaux)</td><td>Simple A — plusieurs onglets</td><td>✅ .xlsx seul</td></tr>
              <tr><td>Cave à levain, Novoma, Dailles…</td><td>Fichier fournisseur ou <strong>Simple B</strong></td><td>✅ ✅</td></tr>
              <tr><td>Saldac, Gebana, nouveaux…</td><td><strong>Simple B</strong></td><td>✅ ✅</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Après import */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Après l&apos;import</h2>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: 1.75, color: 'rgba(16,24,40,0.75)' }}>
          <li>Produits <strong>créés ou mis à jour</strong> dans la base.</li>
          <li>Biopartner : articles absents du fichier <strong>retirés</strong> de ce catalogue.</li>
          <li>Locaux : produits absents <strong>restent</strong> — masquer dans Fournisseurs si besoin.</li>
          <li>Adhérents Ciel/Terre voient le catalogue ; vérifier date limite dans <strong>Fournisseurs</strong>.</li>
        </ol>
      </section>
    </div>
  )
}
