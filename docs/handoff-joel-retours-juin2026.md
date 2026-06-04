# Handoff — retours Joel (juin 2026, suite)

> **À copier-coller en ouverture d’un nouveau chat Cursor.**  
> Georgina = débutante : expliquer simplement, **étape par étape**, **valider avant chaque modification de code**.  
> Travail sur **`staging`** → preprod ; merge **`main`** seulement après OK Georgina.  
> **Ne pas commit/push** sans demande explicite.

---

## Contexte rapide

| Élément | État |
|--------|------|
| **Prod www** | Inscriptions OK (SMTP Infomaniak). Textes adhésion, bannière confirmation, messages erreur — **déjà mergés sur `main`** (juin 2026). |
| **Preprod** | En plus : bandeau catalogue option C, 1 catégorie directe, nouveaux grossistes (fiches + import), Bioterroir **0,25 kg**. |
| **`main` vs `staging`** | 3 commits catalogue pas encore sur prod : `5daaa96`, `1b4d32c`, `ab8762a`. |
| **Base Supabase** | **Partagée** prod = preprod. |
| **Joel** | Avait dit **OK pour passer en prod** le lot catalogue testé en preprod — **avant** les 3 retours ci-dessous. |

---

## Décision prod à trancher avec Georgina (début de chat)

**Recommandation :**

1. **Corriger d’abord** l’import Bioterroir (bloquant Joel) sur `staging`.
2. **Merger `staging` → `main`** le lot déjà validé par Joel (catalogue + 0,25 kg + bandeau C) **une fois import Bioterroir OK**.
3. Traiter **Biopartner** (UC / +10 % / colonne V) et **avoirs** dans un **2ᵉ lot** (preprod → prod après validation).

**Ne pas attendre les avoirs** pour le merge du lot inscription + catalogue déjà OK.

---

## Retour 1 — Import Bioterroir : erreur SQL

**Message Joel :** `Lot 1 : ON CONFLICT DO UPDATE command cannot affect row a second time`

**Cause probable :** import local (`lib/import/upsert-local.ts`) génère `supplier_ref` à partir du **nom** produit (`localProductRef(name)`). Si le fichier Excel contient **deux lignes avec le même nom** (ou noms qui normalisent pareil), un même `supplier_ref` apparaît **deux fois** dans le même batch `upsert` → erreur PostgreSQL.

**Piste de fix (à valider avant code) :**

- Utiliser la **colonne ID** Bioterroir (première colonne numérique du fichier) comme `supplier_ref` au lieu du nom seul ; **ou**
- Dédupliquer les lignes avant upsert (garder la dernière) ; **ou**
- Fusionner les doublons avec log pour Joel.

**Fichiers :**

- `lib/import/upsert-local.ts` — `localProductRef`, batch upsert
- `lib/import/local-suppliers.ts` — `parseLocalSheet` (ne lit pas l’ID colonne A aujourd’hui)
- `app/api/admin/import-local-supplier/route.ts`
- `app/api/admin/import-hebdo/route.ts` (feuille Bioterroir)

**Test :** réimporter `Bioterroir JJ.MM.AAAA.xlsx` sur preprod après fix.

---

## Retour 2 — Biopartner : règles quantité / catégories

### 2a — Majoration +10 % et produits « diminuables »

**Exemple Joel :** article **410002015**

**Logique actuelle** (`lib/import/biopartner-csv.ts`) :

- `min_quantity` = colonne **UC** (entier, défaut 1)
- `allows_partial_order` = **`true` si UC > 1`**
- Majoration +10 % (`lib/catalog/pricing.ts`) : si `allows_partial_order && quantity < min_quantity`

Donc pour UC = 1 → **pas** de commande partielle / pas de +10 % en dessous du minimum.

**Demande Joel :** vérifier la formule pour les produits qui **peuvent** être diminués avec +10 % vs ceux qui **ne peuvent pas** — l’exemple 410002015 suggère que la règle actuelle est **fausse pour certains articles**.

**À faire :**

1. Inspecter la ligne CSV **410002015** (colonnes UC, UM, Facteur, etc.).
2. Identifier la **bonne colonne** Biopartner pour « commande partielle / +10 % » (peut-être pas seulement UC > 1).
3. Ajuster `rowToProduct` + tests manuels catalogue + panier.

### 2b — Catégories colonne V (pré-tri site)

**Demande :** utiliser une colonne du CSV (Joel dit **colonne V** Excel) pour les catégories affichées sur le site — catalogue plus pré-trié, recherche plus rapide.

**Actuel :** `category` = colonne **`Groupe produit principal`** (`buildCategory` dans `biopartner-csv.ts`).

**À faire :**

1. Ouvrir un export Biopartner réel, identifier **quelle colonne est V** (nom d’en-tête exact).
2. Étendre `BiopartnerRow` + `buildCategory` (ou champ parallèle) si besoin.
3. Réimporter un catalogue test → vérifier filtres catégories catalogue.

**Fichiers :**

- `lib/import/biopartner-csv.ts`
- `app/api/admin/import-biopartner/route.ts`
- `components/CatalogueClient.tsx` (affichage catégories depuis résumés produits)

---

## Retour 3 — Avoir / crédit sur compte membre (NOUVEAU — gros sujet)

**Demande Joel :**

- Afficher un **avoir** sur le **compte perso** des adhérents
- Joel ajoute les montants **manuellement**
- **Déduction automatique** du total des commandes **après validation livraison**

**État actuel :** **aucune** fonctionnalité « avoir / credit / balance » dans le code (grep vide).

**Impact :** évolution **métier + technique** — pas un quick fix.

**À clarifier avec l’asso avant gros dev :**

| Question | Pourquoi |
|----------|----------|
| Avoir en **CHF** ou en **%** ? | Stockage + affichage |
| Un avoir par membre ou par commande ? | Modèle de données |
| Déduction sur **quelle** commande (toutes fournisseurs / une seule) ? | Règles métier |
| « Après validation livraison » = statut commande **Livrée** ? | Hook existant admin |
| Joel saisit où ? **Admin → Membres** ? | Nouvelle UI |

**Piste technique (pour plus tard) :**

- Table `member_credits` ou colonnes `profiles.credit_balance`
- Admin : champ « Ajouter avoir CHF »
- Mon compte : solde visible
- À la commande ou au passage **Livrée** : appliquer crédit au `total`

**Décision juin 2026 (Georgina) : ne pas envoyer de mail à Joel avant livraison code. Spec avoir ci-dessous (métier), pas questionnaire Joel.**

### Avoirs — spec retenue (métier, pas mail Joel)

| Règle | Choix pro |
|-------|-----------|
| Unité | CHF (évident) |
| Saisie | Admin → Membre : montant crédité |
| Visible adhérent | Mon compte : « Avoir disponible : X CHF » |
| Déduction | **À la commande** (total confirmé = total − min(avoir, total)) — interprétation cohérente de « quand il passe commande » |
| Pas « seulement à Livrée » seul | Évite double logique ; si Joel parlait de la caisse physique, le site reflète la dette dès la commande |
| Commande annulée | Avoir **recrédité** (montant qui avait été utilisé sur cette commande) |
| Plusieurs commandes | Solde diminue à chaque commande jusqu’à 0 |
| 410002015 / catégories V | Ajuster en code + tests ; pas de question Joel sauf blocage métier |

**Codé (juin 2026, staging) :**
- Import Bioterroir : dédoublonnage + n° article + message admin
- Biopartner : catégorie `Categorie produit` (col. V)
- Avoirs : `credit_balance` profil, admin Membres, Mon compte, panier, déduction commande, restitution si annulation
- Migration : `supabase/migrations/20260603_member_credit.sql` (**à exécuter dans Supabase SQL Editor**)

**Pas de mail à Joel avant tests preprod.**

---

## Déjà livré (rappel — ne pas refaire)

- SMTP Infomaniak + rate limits Supabase
- Textes adhésion, messages inscription, lien confirmation, bannière connexion
- Bandeau catalogue fournisseurs ouverts (option C)
- Saut 1 catégorie (hors Biopartner)
- Fiches Saldac, Gebana, Dr Jacob's, Kumbha + import CSV générique admin
- Bioterroir **0,25 kg** au catalogue (pas besoin changer Excel Joel) — `lib/catalog/bioterroir-quantity.ts`
- Migration SQL optionnelle : `supabase/migrations/20260602_bioterroir_quantity_step.sql`

---

## Fichiers clés

```
lib/import/upsert-local.ts
lib/import/local-suppliers.ts
lib/import/biopartner-csv.ts
lib/catalog/pricing.ts
lib/catalog/quantity-rules.ts
components/CatalogueClient.tsx
app/[locale]/admin/import/
app/[locale]/(members)/mon-compte/
```

---

## Ordre de travail proposé (nouveau chat)

| Phase | Tâche |
|-------|--------|
| **A** | Fix import Bioterroir (doublons `supplier_ref`) |
| **B** | Test preprod + OK Georgina → **merge `main`** (lot catalogue déjà validé) |
| **C** | Biopartner UC / +10 % article 410002015 |
| **D** | Biopartner catégorie colonne V |
| **E** | Spec + accord asso → avoirs (phase séparée) |

---

*Handoff retours Joel — juin 2026*
