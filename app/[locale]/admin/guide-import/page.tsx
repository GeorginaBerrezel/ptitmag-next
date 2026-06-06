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
      <h1 style={{ marginBottom: '0.35rem' }}>Guide import — colonnes &amp; formats</h1>
      <p className={styles.intro}>
        Ce guide explique <strong>comment le site lit chaque fichier</strong> et où vont les informations
        dans le catalogue (nom, prix, catégorie, référence…). À partager avec Joel ou un nouveau fournisseur.
      </p>

      <div className={styles.actions}>
        <Link href="/admin/import" locale={locale} className={`${styles.btn} ${styles.btnPrimary}`}>
          → Aller à Import produits
        </Link>
        <a
          href="https://shop.biopartner.ch"
          target="_blank"
          rel="noreferrer"
          className={styles.btn}
        >
          shop.biopartner.ch ↗
        </a>
      </div>

      {/* Résumé rapide */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Résumé — quel format pour qui ?</h2>
        <p className={styles.sectionSub}>
          Le site ne lit pas tous les fichiers de la même manière : chaque fournisseur a son parseur.
        </p>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.summaryTable}`}>
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>Fichier</th>
                <th>Où importer</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Biopartner (×4)</td>
                <td><strong>.xlsx</strong> (CSV secours)</td>
                <td>Import → Biopartner</td>
              </tr>
              <tr>
                <td>Locaux (Bioterroir, Didi…)</td>
                <td><strong>.xlsx</strong></td>
                <td>Import → local ou feuille hebdo</td>
              </tr>
              <tr>
                <td>Cave à levain, Novoma…</td>
                <td>.csv</td>
                <td>Import → grossiste dédié</td>
              </tr>
              <tr>
                <td>Nouveau grossiste</td>
                <td>.csv ; avec <code>nom</code> + <code>prix</code></td>
                <td>Import → CSV générique</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Biopartner */}
      <section className={styles.section}>
        <span className={`${styles.badge} ${styles.badgeBio}`}>Biopartner — le plus détaillé</span>
        <h2 className={styles.sectionTitle}>1. Fichier Excel Biopartner (.xlsx)</h2>
        <p className={styles.sectionSub}>
          Déposer le fichier <strong>tel quel</strong> depuis Biopartner. Le site cherche la ligne d&apos;en-tête
          qui commence par <code>Article</code> (colonne A), puis lit chaque ligne produit.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Colonne Excel</th>
                <th>En-tête</th>
                <th>→ Sur le site</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>A</td>
                <td><code>Article</code></td>
                <td>Réf. fournisseur (numéro article)</td>
              </tr>
              <tr>
                <td>B + C</td>
                <td><code>Désignation</code> + <code>Désignation 2</code></td>
                <td>Nom du produit</td>
              </tr>
              <tr>
                <td>F</td>
                <td><code>UM</code></td>
                <td>0 = prix HT (+ TVA col. Z) · 1 = prix déjà TTC</td>
              </tr>
              <tr>
                <td>G</td>
                <td><code>UC</code></td>
                <td>Quantité minimum de commande</td>
              </tr>
              <tr>
                <td>J</td>
                <td><code>Prix</code></td>
                <td>Prix catalogue (HT ou TTC selon UM)</td>
              </tr>
              <tr>
                <td>V</td>
                <td><code>Categorie produit</code></td>
                <td>Catégorie dans le menu catalogue</td>
              </tr>
              <tr>
                <td>Z</td>
                <td><code>TVA</code></td>
                <td>2,6&nbsp;% (alimentaire) ou 8,1&nbsp;% (non alimentaire) si UM = 0</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className={styles.example}>
          <strong>Exemple</strong>
          Savon · Article 500600396 · Prix 9,39 · UM 0 · TVA «&nbsp;normal 8.1%&nbsp;»
          → <strong>10,15 CHF</strong> affiché (9,39 × 1,081).
        </div>
        <p className={styles.note}>
          <strong>PDF :</strong> non importable. Ouvrir dans Excel puis enregistrer en .xlsx.
        </p>
      </section>

      {/* Locaux */}
      <section className={styles.section}>
        <span className={`${styles.badge} ${styles.badgeLocal}`}>Producteurs locaux</span>
        <h2 className={styles.sectionTitle}>2. Fichier Excel local (.xlsx)</h2>
        <p className={styles.sectionSub}>
          Un onglet par producteur (ou un fichier par producteur). Le site cherche une ligne avec
          le mot <code>Produit</code> en en-tête, puis lit les lignes en dessous.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Colonne</th>
                <th>Contenu habituel</th>
                <th>→ Sur le site</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>A (ou col. «&nbsp;Produit&nbsp;»)</td>
                <td>Nom du produit</td>
                <td>Nom affiché</td>
              </tr>
              <tr>
                <td>D (souvent)</td>
                <td>Prix d&apos;achat TTC ou HT</td>
                <td>Prix catalogue</td>
              </tr>
              <tr>
                <td>E (souvent)</td>
                <td>kg, pièce, bouteille…</td>
                <td>Unité (kg, pièce…)</td>
              </tr>
              <tr>
                <td>—</td>
                <td>Nom de l&apos;onglet / fournisseur choisi</td>
                <td>Catégorie (Légumes, Boulangerie, Vins…)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className={styles.example}>
          <strong>Exemple Truffes / Vins</strong>
          Produit «&nbsp;Truffe noire 75%&nbsp;» · 3,50 CHF · pièce → ligne catalogue prête à commander.
        </div>
        <p className={styles.note}>
          <strong>Bioterroir :</strong> parfois 2 colonnes prix (HT + TTC) — le site prend le <strong>TTC</strong>.
        </p>
      </section>

      {/* Générique */}
      <section className={styles.section}>
        <span className={`${styles.badge} ${styles.badgeGeneric}`}>Nouveau fournisseur — modèle simple</span>
        <h2 className={styles.sectionTitle}>3. CSV générique (nouveau grossiste)</h2>
        <p className={styles.sectionSub}>
          Gabarit le plus simple pour un futur Excel de Joel : une ligne = un produit,
          séparateur <strong>point-virgule</strong> (<code>;</code>), encodage <strong>UTF-8</strong>.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Colonne</th>
                <th>Obligatoire ?</th>
                <th>→ Sur le site</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>nom</code> (ou name, produit, designation)</td>
                <td>Oui</td>
                <td>Nom du produit</td>
              </tr>
              <tr>
                <td><code>prix</code> (ou price, tarif)</td>
                <td>Oui</td>
                <td>Prix catalogue</td>
              </tr>
              <tr>
                <td><code>categorie</code></td>
                <td>Non</td>
                <td>Rayon dans le catalogue</td>
              </tr>
              <tr>
                <td><code>unite</code></td>
                <td>Non</td>
                <td>kg, pièce, pot… (défaut : pièce)</td>
              </tr>
              <tr>
                <td><code>ref</code></td>
                <td>Non</td>
                <td>Référence fournisseur</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className={styles.example}>
          <strong>Exemple de fichier</strong>
          <code>nom;prix;categorie;unite</code><br />
          Miel de montagne;12.50;Épicerie;pot<br />
          Confiture abricot;8.00;Épicerie;pot
        </div>
      </section>

      {/* Flux */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Après l&apos;import — que se passe-t-il ?</h2>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: 1.75, color: 'rgba(16,24,40,0.75)' }}>
          <li>Les produits du fichier sont <strong>créés ou mis à jour</strong> dans la base.</li>
          <li>Les articles absents du fichier sont <strong>retirés du catalogue actif</strong> (Biopartner / remplacement).</li>
          <li>Les adhérents voient les produits dans <strong>Catalogue</strong> (si statut Ciel ou Terre validé).</li>
          <li>Vérifier dans <strong>Fournisseurs</strong> que le fournisseur est actif et la date limite est correcte.</li>
        </ol>
      </section>
    </div>
  )
}
