# Handoff — avant merge `staging` → `main` (juin 2026)

> **Usage :** copier la section **« Bloc à coller »** au début de chaque nouvelle conversation Cursor.  
> **Mettre à jour ce fichier** avant chaque merge `staging` → `main` (date, tags, checklist prod).

---

## Recommandation merge (juin 2026)

**Attendre v1.6, puis pousser v1.5.1 + v1.6 ensemble en prod** — tag unique **`v1.6.0`**.

| Option | Quand | Tag |
|--------|-------|-----|
| **Recommandé** | Après v1.6 testée en preprod | `v1.6.0` (contient Vérène v1.5.1 + case « récupéré ») |
| Alternative | Joel veut le texte Vérène en prod **tout de suite** | `v1.5.1` maintenant, puis `v1.6.0` plus tard |

Pourquoi attendre : v1.5.1 = contenu pur (texte + photos partielles), v1.6 = petite feature membre — un seul cycle de test Joel, un seul déploiement prod.

**Ne pas merger** le travail local non poussé `fix/verene-images-supplier-ref` (photos alternées) — Georgina a validé : on garde l’existant tant qu’il manque des photos Joel.

---

## État Git (16 juin 2026)

| Branche | Commit tête | Contenu vs prod |
|---------|-------------|-----------------|
| `main` / prod | `be424df` | v1.5.0 — wishlist Mes favoris |
| `staging` / preprod | `7ae13c5` | + v1.5.1 Vérène (PR #15, #16) |

**Tags prod existants :** v1.0.0 → v1.5.0  
**En preprod, pas encore en prod :** texte Vérène, photos catalogue (partielles), fix mapping enrobages.

**PRs mergées staging :**
- [#15](https://github.com/GeorginaBerrezel/ptitmag-next/pull/15) — texte + photos Vérène + resync wishlist
- [#16](https://github.com/GeorginaBerrezel/ptitmag-next/pull/16) — mapping photos enrobages / boîtes cadeau

---

## Bloc à coller (nouvelle conversation)

```
Projet : ptitmag-next — commandes groupées Le P'tit Mag (St-Romain, Ayent, CH).
Client : Joel Azoo · info@leptitmag.org · domaine leptitmag.org (Infomaniak).

Stack : Next.js 16 · Supabase (auth + PostgreSQL) · Vercel · GitHub GeorginaBerrezel/ptitmag-next.

URLs :
- Prod : https://www.leptitmag.org (branche main)
- Preprod : https://preprod.leptitmag.org (branche staging)
- Dev : http://localhost:3000

Workflow :
feat|fix/chore/docs-xxx → PR → staging → preprod → validation Georgina/Joel → PR staging → main → tag → prod

Règles Georgina :
- Débutante — vulgariser, une étape à la fois.
- Attendre « ok » / « go » avant commit, push, merge, DNS, Supabase.
- Jamais push direct sur main.
- Preprod et prod partagent la MÊME base Supabase (attention tests / imports).

Admin autorisé : info@leptitmag.org, georgina.berrezel@gmail.com (lib/admin/access.ts).

Docs repo : docs/workflow-git.md, docs/hebergement-et-deploiement.md, docs/guide-joel.md, docs/handoff-avant-merge-main-juin2026.md

---

ROADMAP RELEASES (juin 2026)

| Vague | Contenu | Statut |
|-------|---------|--------|
| 1 | Admin tri alpha + accordéons commandes | ✅ prod v1.3.0 |
| 2 | Catalogue filtres recherche cumulatifs | ✅ prod v1.4.0 |
| 3 | Wishlist « Mes favoris » + import auto historique | ✅ prod v1.5.0 |
| 3b | Vérène Melchior texte + photos catalogue (partiel) | ✅ preprod — ⏳ prod avec v1.6 |
| 4a | v1.6 — Case « produit récupéré » (Anouchka) | 🔜 À FAIRE |
| 4b | v2.0 — Admin commandes métier (Joel) | 🔜 À FAIRE |

---

CE QUI EST FAIT (prod v1.5.0)

- Tri alphabétique admin membres + accordéons commandes par membre
- Filtres catalogue recherche (fournisseur, catégorie, type — cumulatifs, producteurs en haut en recherche)
- Mes favoris : cœur header, page /mes-favoris, import auto 1ère visite depuis commandes passées
- Migration SQL : supabase/migrations/20260614_wishlist_items.sql (vérifier exécutée en prod Supabase)

CE QUI EST EN PREPROD (pas encore main)

- Fiche producteur Vérène Melchior : « Gourmandises crues et biologiques » / « Truffes et moelleux biologiques » + logo
- Photos catalogue Vérène : moelleux → brownies ; enrobages → plateau truffes ; boîtes cadeau → photo cadeau ; reste → placeholder gris si pas de photo Joel
- Système images : lib/catalog/verene-melchior-images.ts, scripts/verene-melchior-images-compress.mjs
- Limitation connue : Joel n’a pas 1 photo par enrobage — plusieurs produits partagent la même image. OK pour l’instant.

CE QUI EST LOCAL NON MERGÉ (NE PAS POUSSER)

- Branche abandonnée : fix/verene-images-supplier-ref (3 photos enrobages alternées + supplier_ref) — Georgina a dit laisser tel quel.

---

PROCHAINE FEATURE : v1.6 (Anouchka / Joel UX membre)

Case à cocher « J’ai récupéré ce produit » — organisation perso, optionnelle, sans impact métier.

- Emplacement : Mon compte → onglet Commandes **Livrées**, une case par ligne produit
- Stockage v1 : localStorage (pas de migration SQL)
- Ne PAS confondre avec « Retirer un produit » admin (v2.0 — annule ligne, recalcule total, email)
- Bonus possible v1.6.1 : vue « Mon retrait » regroupant toutes les lignes livrées

Branche suggérée : feat/retrait-checklist-membre

---

GROS CHANTIER : v2.0 Admin commandes (Joel) — DÉCOUPER EN SOUS-VAGUES

Ne pas tout livrer d’un bloc. Tester chaque morceau en preprod.

v2.0-a — Regroupement UI + emails groupés par membre (livré + clôturé, 1 email au lieu de 1 par fournisseur)
v2.0-b — Avoir déduit uniquement à la clôture groupée + total général membre
v2.0-c — « À clôturer » : ajout produit admin only (plus côté membre), qté 1, sans majoration
v2.0-d — Champs modifiables à la clôture (qté, prix unitaire) — cas particuliers Joel
v2.0-e — Retirer produit : périmètre strict (à clôturer, panier membre admin+membre ; pas récap groupé fournisseur sauf modes action/toClose)

État actuel code :
- Membre peut encore ajouter produits commande livrée (/api/member/orders/add-item)
- Retrait produit : admin seulement (/api/admin/orders/cancel-item)
- Emails : 1 par commande/fournisseur à livraison et clôture
- Avoir : preview OK côté membre ; logique mixte anciennes commandes (credit_applied à la commande vs à la clôture)

---

AUTRES DEMANDES JOEL / CONTENU (hors code ou plus tard)

- Ingrédients moelleux (3 variantes) → descriptions fiches produit Supabase / import Joel
- Graines d’Avenir vacances / Cave à Levain → opérationnel catalogue
- Photos Vérène complètes → quand Joel envoie 1 photo par produit, script compression prêt
- Favoris : variante future « favoris manuels vs suggestions historique » (discuté, pas prioritaire)

---

CHECKLIST AVANT MERGE staging → main (à refaire à chaque release)

[ ] Preprod testée (Georgina + Joel si besoin)
[ ] Migration SQL prod exécutée si nouvelle migration dans le merge
[ ] Tag prévu (ex. v1.6.0)
[ ] Ce handoff mis à jour
[ ] PR staging → main créée
[ ] Après merge : git tag -a vX.Y.Z && git push origin vX.Y.Z
[ ] Vérifier prod www.leptitmag.org (~2 min)
[ ] Resync staging si besoin : merge main → staging

Commandes merge prod (quand Georgina dit « go prod ») :

git checkout main && git pull origin main
git merge origin/staging
git push origin main
git tag -a v1.6.0 -m "Release juin 2026 — Vérène v1.5.1 + checklist retrait v1.6"
git push origin v1.6.0

---

Fichiers clés récents

- lib/catalog/verene-melchior-images.ts — mapping photos Vérène
- lib/catalog/local-producers.ts — fiches producteurs
- lib/wishlist/* — Mes favoris
- app/[locale]/(members)/mes-favoris/
- app/[locale]/(members)/mon-compte/MyOrdersSection.tsx — onglets commandes (cible v1.6)
- app/[locale]/admin/commandes/page.tsx — admin commandes (cible v2.0)
- lib/orders/close-order.ts — clôture + avoir
```

---

## Notes pour l’agent

- Georgina prépare une **nouvelle conversation** après ce handoff.
- Prochaine tâche code : **v1.6** (case récupéré), branche `feat/retrait-checklist-membre`.
- **Ne pas** commit/push sans « go » explicite.
- Photos Vérène : le système fonctionne ; contenu incomplet = normal jusqu’à photos Joel.

*Généré le 16 juin 2026 — avant merge prod v1.5.1 / v1.6.0.*
